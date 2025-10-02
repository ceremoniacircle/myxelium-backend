/**
 * Twilio Webhook Handler
 *
 * Receives and processes webhook events from Twilio for SMS delivery tracking.
 *
 * Webhook Setup Instructions:
 * 1. Log in to Twilio console: https://console.twilio.com
 * 2. Go to Phone Numbers > Manage > Active Numbers
 * 3. Click on your phone number
 * 4. Under "Messaging", set:
 *    - A MESSAGE COMES IN: Webhook - https://yourdomain.com/api/webhooks/twilio
 *    - Configure with: HTTP POST
 * 5. Under "Configure", set:
 *    - STATUS CALLBACK URL: https://yourdomain.com/api/webhooks/twilio
 * 6. Set TWILIO_WEBHOOK_AUTH_TOKEN in your .env.local for signature verification
 *
 * Events Handled:
 * - queued → Initial status (message queued)
 * - sent → Update status to 'sent'
 * - delivered → Update status to 'delivered', set delivered_at
 * - failed → Update status to 'failed', set error details
 * - undelivered → Update status to 'bounced', set bounce details
 *
 * Auto-Response Handling:
 * - STOP/STOPALL/UNSUBSCRIBE → Unsubscribe from SMS
 * - START/YES/UNSTOP → Resubscribe to SMS
 * - HELP/INFO → Send help message
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import twilio from 'twilio';
import type { TwilioWebhookEvent } from '@/lib/twilio/types';
import { handleAutoResponse, isAutoResponseKeyword } from '@/lib/twilio/helpers';
import { twilioClient, TWILIO_PHONE_NUMBER } from '@/lib/twilio/client';

/**
 * Verify Twilio webhook signature
 *
 * @param request - Next.js request object
 * @param body - Parsed body object
 * @returns True if signature is valid
 */
async function verifyWebhookSignature(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: Record<string, any>
): Promise<boolean> {
  const signature = request.headers.get('x-twilio-signature');

  // If no auth token configured, skip verification (dev mode)
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.warn('[twilio-webhook] TWILIO_AUTH_TOKEN not set - skipping signature verification');
    return true;
  }

  if (!signature) {
    console.error('[twilio-webhook] Missing x-twilio-signature header');
    return false;
  }

  try {
    // Get full URL for signature verification
    const url = request.url;

    // Validate request signature
    const isValid = twilio.validateRequest(authToken, signature, url, body);

    return isValid;
  } catch (error) {
    console.error('[twilio-webhook] Error verifying signature:', error);
    return false;
  }
}

/**
 * POST /api/webhooks/twilio
 *
 * Handle incoming webhook events from Twilio
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form-urlencoded body (Twilio sends as form data)
    const formData = await request.formData();
    const body: Record<string, string> = {};

    formData.forEach((value, key) => {
      body[key] = value.toString();
    });

    console.log('[twilio-webhook] Received webhook:', body);

    // Extract relevant fields
    const payload: TwilioWebhookEvent = {
      MessageSid: body.MessageSid || body.SmsSid || '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MessageStatus: (body.MessageStatus || body.SmsStatus || '') as any,
      To: body.To || '',
      From: body.From || '',
      Body: body.Body || '',
      ErrorCode: body.ErrorCode,
      ErrorMessage: body.ErrorMessage,
    };

    // Verify webhook signature
    const signatureValid = await verifyWebhookSignature(request, body);

    // Log webhook event to database
    const { data: webhookEvent, error: webhookError } = await db
      .from('webhook_events')
      .insert({
        provider: 'twilio',
        event_type: payload.MessageStatus,
        payload: payload,
        headers: Object.fromEntries(request.headers.entries()),
        signature_valid: signatureValid,
      })
      .select('id')
      .single();

    if (webhookError) {
      console.error('[twilio-webhook] Error logging webhook event:', webhookError);
    }

    // Reject if signature is invalid
    if (!signatureValid) {
      console.error('[twilio-webhook] Invalid signature');

      if (webhookEvent?.id) {
        await db
          .from('webhook_events')
          .update({
            processed: true,
            processing_error: 'Invalid signature',
          })
          .eq('id', webhookEvent.id);
      }

      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Check if this is an incoming message (user reply)
    const isIncomingMessage = payload.From && !payload.MessageStatus;

    if (isIncomingMessage) {
      // Handle incoming message (auto-responses)
      return await handleIncomingMessage(payload, webhookEvent?.id);
    }

    // Handle status callbacks
    console.log(`[twilio-webhook] Received event: ${payload.MessageStatus} for message ${payload.MessageSid}`);

    // Find the message by provider_message_id
    const { data: message, error: findError } = await db
      .from('sent_messages')
      .select('id, status, contact_id')
      .eq('provider_message_id', payload.MessageSid)
      .maybeSingle();

    if (findError) {
      console.error('[twilio-webhook] Error finding message:', findError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!message) {
      console.warn(`[twilio-webhook] Message not found for MessageSid: ${payload.MessageSid}`);

      // Still mark webhook as processed (might be a test event)
      if (webhookEvent?.id) {
        await db
          .from('webhook_events')
          .update({
            processed: true,
            processing_error: 'Message not found',
          })
          .eq('id', webhookEvent.id);
      }

      return NextResponse.json({ received: true, warning: 'Message not found' }, { status: 200 });
    }

    // Update message based on event type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    switch (payload.MessageStatus) {
      case 'queued':
        // Message queued (initial status)
        if (message.status === 'pending') {
          updateData.status = 'queued';
        }
        break;

      case 'sent':
        // Message sent to carrier
        if (['pending', 'queued'].includes(message.status)) {
          updateData.status = 'sent';
          updateData.sent_at = new Date().toISOString();
        }
        break;

      case 'delivered':
        // Message successfully delivered
        updateData.status = 'delivered';
        updateData.delivered_at = new Date().toISOString();
        break;

      case 'failed':
        // Message failed to send
        updateData.status = 'failed';
        updateData.error_code = payload.ErrorCode || 'unknown';
        updateData.error_message = payload.ErrorMessage || 'Unknown error';
        break;

      case 'undelivered':
        // Message could not be delivered
        updateData.status = 'bounced';
        updateData.bounced_at = new Date().toISOString();
        updateData.error_code = payload.ErrorCode || 'undelivered';
        updateData.error_message = payload.ErrorMessage || 'Message undelivered';
        break;

      default:
        console.warn(`[twilio-webhook] Unknown event type: ${payload.MessageStatus}`);
    }

    // Update the message in database
    const { error: updateError } = await db
      .from('sent_messages')
      .update(updateData)
      .eq('id', message.id);

    if (updateError) {
      console.error('[twilio-webhook] Error updating message:', updateError);

      // Mark webhook as failed
      if (webhookEvent?.id) {
        await db
          .from('webhook_events')
          .update({
            processed: true,
            processing_error: updateError.message,
            sent_message_id: message.id,
          })
          .eq('id', webhookEvent.id);
      }

      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }

    console.log(`[twilio-webhook] Successfully processed ${payload.MessageStatus} for message ${message.id}`);

    // Mark webhook as processed
    if (webhookEvent?.id) {
      await db
        .from('webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          sent_message_id: message.id,
        })
        .eq('id', webhookEvent.id);
    }

    // Create activity record for important events
    if (['delivered', 'failed', 'undelivered'].includes(payload.MessageStatus)) {
      let activityType = '';
      switch (payload.MessageStatus) {
        case 'delivered':
          activityType = 'sms_delivered';
          break;
        case 'failed':
          activityType = 'sms_failed';
          break;
        case 'undelivered':
          activityType = 'sms_bounced';
          break;
      }

      await db.from('activities').insert({
        contact_id: message.contact_id,
        activity_type: activityType,
        activity_data: {
          message_id: message.id,
          message_sid: payload.MessageSid,
          status: payload.MessageStatus,
          error_code: payload.ErrorCode,
          error_message: payload.ErrorMessage,
        },
        related_to_type: 'message',
        related_to_id: message.id,
        occurred_at: new Date().toISOString(),
        source: 'webhook',
      });
    }

    // Return 200 OK to acknowledge webhook
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[twilio-webhook] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle incoming message from user (replies, auto-responses)
 */
async function handleIncomingMessage(
  payload: TwilioWebhookEvent,
  webhookEventId?: string
): Promise<NextResponse> {
  console.log(`[twilio-webhook] Incoming message from ${payload.From}: ${payload.Body}`);

  // Check if it's an auto-response keyword
  const autoResponse = handleAutoResponse(payload.Body);

  if (autoResponse) {
    console.log(`[twilio-webhook] Auto-response keyword detected: ${payload.Body}`);

    // Find contact by phone number
    const { data: contact } = await db
      .from('contacts')
      .select('id, sms_consent')
      .eq('phone', payload.From)
      .maybeSingle();

    if (contact) {
      // Update consent based on keyword
      const keyword = payload.Body.trim().toUpperCase();

      if (isAutoResponseKeyword(keyword) && ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(keyword)) {
        // Revoke SMS consent
        await db
          .from('contacts')
          .update({
            sms_consent: false,
            sms_consent_date: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contact.id);

        console.log(`[twilio-webhook] SMS consent revoked for contact ${contact.id}`);

        // Create activity record
        await db.from('activities').insert({
          contact_id: contact.id,
          activity_type: 'sms_unsubscribed',
          activity_data: {
            keyword: payload.Body,
            from_phone: payload.From,
          },
          occurred_at: new Date().toISOString(),
          source: 'webhook',
        });
      } else if (isAutoResponseKeyword(keyword) && ['START', 'YES', 'UNSTOP'].includes(keyword)) {
        // Grant SMS consent
        await db
          .from('contacts')
          .update({
            sms_consent: true,
            sms_consent_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', contact.id);

        console.log(`[twilio-webhook] SMS consent granted for contact ${contact.id}`);

        // Create activity record
        await db.from('activities').insert({
          contact_id: contact.id,
          activity_type: 'sms_subscribed',
          activity_data: {
            keyword: payload.Body,
            from_phone: payload.From,
          },
          occurred_at: new Date().toISOString(),
          source: 'webhook',
        });
      }
    }

    // Send auto-response
    try {
      if (!TWILIO_PHONE_NUMBER) {
        throw new Error('TWILIO_PHONE_NUMBER not configured');
      }

      await twilioClient.messages.create({
        body: autoResponse,
        from: TWILIO_PHONE_NUMBER,
        to: payload.From,
      });

      console.log(`[twilio-webhook] Sent auto-response to ${payload.From}`);
    } catch (error) {
      console.error('[twilio-webhook] Error sending auto-response:', error);
    }

    // Mark webhook as processed
    if (webhookEventId) {
      await db
        .from('webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('id', webhookEventId);
    }

    return NextResponse.json({ received: true, autoResponse: true }, { status: 200 });
  }

  // Not an auto-response keyword - just log it
  console.log(`[twilio-webhook] Non-keyword message received: ${payload.Body}`);

  // Mark webhook as processed
  if (webhookEventId) {
    await db
      .from('webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('id', webhookEventId);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
