/**
 * Zoom Webhook Handler
 *
 * Receives and processes webhook events from Zoom for attendance tracking.
 *
 * Webhook Setup Instructions:
 * 1. Log in to Zoom App Marketplace: https://marketplace.zoom.us
 * 2. Navigate to "Develop" > "Build App" > Select "Webhook Only"
 * 3. Or go to your existing Server-to-Server OAuth app
 * 4. Navigate to "Features" > "Event Subscriptions"
 * 5. Add your webhook endpoint URL: https://yourdomain.com/api/webhooks/zoom
 * 6. Copy the "Secret Token" and add it to .env.local as ZOOM_WEBHOOK_SECRET_TOKEN
 * 7. Subscribe to these event types:
 *    - Meeting: Started, Ended, Participant Joined, Participant Left
 *    - Webinar: Started, Ended, Participant Joined, Participant Left
 *
 * Events Handled:
 * - endpoint.url_validation → Return encrypted token for verification
 * - meeting.participant_joined → Mark registration as attended
 * - webinar.participant_joined → Mark registration as attended
 * - meeting.participant_left → Calculate attendance duration
 * - webinar.participant_left → Calculate attendance duration
 * - meeting.ended → Trigger post-event funnel
 * - webinar.ended → Trigger post-event funnel
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inngest } from '@/inngest/client';
import type {
  ZoomWebhookEvent,
  ZoomWebhookVerification,
} from '@/lib/zoom/types';
import {
  verifyZoomWebhookSignature,
  handleZoomChallenge,
  extractParticipantEmail,
  extractMeetingId,
  calculateAttendanceDuration,
  isParticipantJoinEvent,
  isParticipantLeaveEvent,
  isMeetingEndedEvent,
} from '@/lib/zoom/helpers';

/**
 * POST /api/webhooks/zoom
 *
 * Handle incoming webhook events from Zoom
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    let payload: ZoomWebhookEvent | ZoomWebhookVerification;

    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error('[zoom-webhook] Invalid JSON payload:', error);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Handle URL verification challenge (Zoom sends this when configuring webhook)
    if (payload.event === 'endpoint.url_validation') {
      const verificationPayload = payload as ZoomWebhookVerification;
      const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

      if (!secretToken) {
        console.error('[zoom-webhook] ZOOM_WEBHOOK_SECRET_TOKEN not configured');
        return NextResponse.json(
          { error: 'Webhook secret not configured' },
          { status: 500 }
        );
      }

      const response = handleZoomChallenge(
        verificationPayload.payload.plainToken,
        secretToken
      );

      console.log('[zoom-webhook] URL validation successful');
      return NextResponse.json(response, { status: 200 });
    }

    // Verify webhook signature for all other events
    const timestamp = request.headers.get('x-zm-request-timestamp');
    const signature = request.headers.get('x-zm-signature');
    const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

    // If no webhook secret configured, skip verification (dev mode)
    let signatureValid = true;
    if (!secretToken) {
      console.warn(
        '[zoom-webhook] ZOOM_WEBHOOK_SECRET_TOKEN not set - skipping signature verification'
      );
    } else {
      signatureValid = verifyZoomWebhookSignature(
        rawBody,
        timestamp,
        signature,
        secretToken
      );
    }

    const webhookEvent = payload as ZoomWebhookEvent;

    // Log webhook event to database
    const { data: loggedEvent, error: webhookError } = await db
      .from('webhook_events')
      .insert({
        provider: 'zoom',
        event_type: webhookEvent.event,
        payload: webhookEvent,
        headers: Object.fromEntries(request.headers.entries()),
        signature_valid: signatureValid,
      })
      .select('id')
      .single();

    if (webhookError) {
      console.error('[zoom-webhook] Error logging webhook event:', webhookError);
    }

    // Reject if signature is invalid
    if (!signatureValid) {
      console.error('[zoom-webhook] Invalid signature');

      if (loggedEvent?.id) {
        await db
          .from('webhook_events')
          .update({
            processed: true,
            processing_error: 'Invalid signature',
          })
          .eq('id', loggedEvent.id);
      }

      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.log(
      `[zoom-webhook] Received event: ${webhookEvent.event} for meeting/webinar ${extractMeetingId(webhookEvent)}`
    );

    // Route to appropriate handler
    let result;

    if (isParticipantJoinEvent(webhookEvent)) {
      result = await handleParticipantJoined(webhookEvent);
    } else if (isParticipantLeaveEvent(webhookEvent)) {
      result = await handleParticipantLeft(webhookEvent);
    } else if (isMeetingEndedEvent(webhookEvent)) {
      result = await handleMeetingEnded(webhookEvent);
    } else {
      // Other events (started, etc.) - just log them
      console.log(
        `[zoom-webhook] Event ${webhookEvent.event} logged but not processed`
      );
      result = { received: true, logged: true };
    }

    // Mark webhook as processed
    if (loggedEvent?.id) {
      await db
        .from('webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          registration_id: result.registrationId || null,
        })
        .eq('id', loggedEvent.id);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[zoom-webhook] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle participant joined event
 * Updates registration.attended = true and creates activity record
 */
async function handleParticipantJoined(event: ZoomWebhookEvent) {
  const email = extractParticipantEmail(event);
  const meetingId = extractMeetingId(event);
  const joinTime = event.payload?.object?.participant?.join_time;

  if (!email || !meetingId) {
    console.warn(
      '[zoom-webhook] Missing email or meeting ID in participant joined event'
    );
    return { received: true, warning: 'Missing required fields' };
  }

  // Find event by platform_event_id first
  const { data: zoomEvent, error: eventError } = await db
    .from('events')
    .select('id, title')
    .eq('platform_event_id', meetingId)
    .maybeSingle();

  if (eventError) {
    console.error('[zoom-webhook] Error finding event:', eventError);
    throw new Error(`Database error: ${eventError.message}`);
  }

  if (!zoomEvent) {
    console.warn(`[zoom-webhook] Event not found for meeting ID ${meetingId}`);
    return {
      received: true,
      warning: 'Event not found',
      meetingId,
    };
  }

  // Find contact by email
  const { data: contact, error: contactError } = await db
    .from('contacts')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (contactError) {
    console.error('[zoom-webhook] Error finding contact:', contactError);
    throw new Error(`Database error: ${contactError.message}`);
  }

  if (!contact) {
    console.warn(`[zoom-webhook] Contact not found for email ${email}`);
    return {
      received: true,
      warning: 'Contact not found',
      email,
    };
  }

  // Find registration by contact_id and event_id
  const { data: registration, error: findError } = await db
    .from('registrations')
    .select('id, contact_id, event_id, attended')
    .eq('contact_id', contact.id)
    .eq('event_id', zoomEvent.id)
    .maybeSingle();

  if (findError) {
    console.error('[zoom-webhook] Error finding registration:', findError);
    throw new Error(`Database error: ${findError.message}`);
  }

  if (!registration) {
    console.warn(
      `[zoom-webhook] Registration not found for email ${email} and meeting ${meetingId}`
    );
    return {
      received: true,
      warning: 'Registration not found',
      email,
      meetingId,
    };
  }

  // Update registration as attended
  const { error: updateError } = await db
    .from('registrations')
    .update({
      attended: true,
      attended_at: joinTime || new Date().toISOString(),
      status: 'attended',
      updated_at: new Date().toISOString(),
    })
    .eq('id', registration.id);

  if (updateError) {
    console.error('[zoom-webhook] Error updating registration:', updateError);
    throw new Error(`Failed to update registration: ${updateError.message}`);
  }

  console.log(
    `[zoom-webhook] Marked registration ${registration.id} as attended for ${email}`
  );

  // Create activity record
  await db.from('activities').insert({
    contact_id: registration.contact_id,
    activity_type: 'event_attended',
    activity_data: {
      event_id: registration.event_id,
      registration_id: registration.id,
      meeting_id: meetingId,
      join_time: joinTime,
      event_name: zoomEvent.title,
      platform: event.event.startsWith('webinar.') ? 'zoom_webinar' : 'zoom_meeting',
    },
    related_to_type: 'registration',
    related_to_id: registration.id,
    occurred_at: joinTime || new Date().toISOString(),
    source: 'webhook',
  });

  return {
    received: true,
    processed: true,
    action: 'marked_attended',
    registrationId: registration.id,
    contactId: registration.contact_id,
    email,
  };
}

/**
 * Handle participant left event
 * Calculates and stores attendance duration
 */
async function handleParticipantLeft(event: ZoomWebhookEvent) {
  const email = extractParticipantEmail(event);
  const meetingId = extractMeetingId(event);
  const joinTime = event.payload?.object?.participant?.join_time;
  const leaveTime = event.payload?.object?.participant?.leave_time;

  if (!email || !meetingId || !joinTime || !leaveTime) {
    console.warn(
      '[zoom-webhook] Missing required fields in participant left event'
    );
    return { received: true, warning: 'Missing required fields' };
  }

  // Calculate duration
  const durationMinutes = calculateAttendanceDuration(joinTime, leaveTime);

  // Find event by platform_event_id first
  const { data: zoomEvent, error: eventError } = await db
    .from('events')
    .select('id')
    .eq('platform_event_id', meetingId)
    .maybeSingle();

  if (eventError) {
    console.error('[zoom-webhook] Error finding event:', eventError);
    throw new Error(`Database error: ${eventError.message}`);
  }

  if (!zoomEvent) {
    console.warn(`[zoom-webhook] Event not found for meeting ID ${meetingId}`);
    return {
      received: true,
      warning: 'Event not found',
      meetingId,
    };
  }

  // Find contact by email
  const { data: contact, error: contactError } = await db
    .from('contacts')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (contactError) {
    console.error('[zoom-webhook] Error finding contact:', contactError);
    throw new Error(`Database error: ${contactError.message}`);
  }

  if (!contact) {
    console.warn(`[zoom-webhook] Contact not found for email ${email}`);
    return {
      received: true,
      warning: 'Contact not found',
      email,
    };
  }

  // Find registration by contact_id and event_id
  const { data: registration, error: findError } = await db
    .from('registrations')
    .select('id, contact_id, event_id')
    .eq('contact_id', contact.id)
    .eq('event_id', zoomEvent.id)
    .maybeSingle();

  if (findError) {
    console.error('[zoom-webhook] Error finding registration:', findError);
    throw new Error(`Database error: ${findError.message}`);
  }

  if (!registration) {
    console.warn(
      `[zoom-webhook] Registration not found for email ${email} and meeting ${meetingId}`
    );
    return {
      received: true,
      warning: 'Registration not found',
      email,
      meetingId,
    };
  }

  // Update attendance duration
  const { error: updateError } = await db
    .from('registrations')
    .update({
      attendance_duration_minutes: durationMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', registration.id);

  if (updateError) {
    console.error(
      '[zoom-webhook] Error updating attendance duration:',
      updateError
    );
    throw new Error(`Failed to update duration: ${updateError.message}`);
  }

  console.log(
    `[zoom-webhook] Updated attendance duration for registration ${registration.id}: ${durationMinutes} minutes`
  );

  return {
    received: true,
    processed: true,
    action: 'updated_duration',
    registrationId: registration.id,
    durationMinutes,
    email,
  };
}

/**
 * Handle meeting/webinar ended event
 * Triggers Inngest post-event funnel
 */
async function handleMeetingEnded(event: ZoomWebhookEvent) {
  const meetingId = extractMeetingId(event);

  if (!meetingId) {
    console.warn('[zoom-webhook] Missing meeting ID in ended event');
    return { received: true, warning: 'Missing meeting ID' };
  }

  // Find event by platform_event_id
  const { data: zoomEvent, error: findError } = await db
    .from('events')
    .select('id, title, scheduled_at')
    .eq('platform_event_id', meetingId)
    .maybeSingle();

  if (findError) {
    console.error('[zoom-webhook] Error finding event:', findError);
    throw new Error(`Database error: ${findError.message}`);
  }

  if (!zoomEvent) {
    console.warn(
      `[zoom-webhook] Event not found for meeting ID ${meetingId}`
    );
    return {
      received: true,
      warning: 'Event not found',
      meetingId,
    };
  }

  // Update event status to completed
  await db
    .from('events')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', zoomEvent.id);

  console.log(
    `[zoom-webhook] Event ${zoomEvent.id} (${zoomEvent.title}) marked as completed`
  );

  // Trigger Inngest post-event funnel
  await inngest.send({
    name: 'event.completed',
    data: {
      eventId: zoomEvent.id,
      eventTitle: zoomEvent.title,
      completedAt: new Date().toISOString(),
    },
  });

  console.log(
    `[zoom-webhook] Triggered post-event funnel for event ${zoomEvent.id}`
  );

  return {
    received: true,
    processed: true,
    action: 'triggered_post_event_funnel',
    eventId: zoomEvent.id,
    eventTitle: zoomEvent.title,
  };
}
