/**
 * Resend Webhook Handler
 *
 * Receives and processes webhook events from Resend for email delivery tracking.
 *
 * Webhook Setup Instructions:
 * 1. Log in to Resend dashboard: https://resend.com/webhooks
 * 2. Click "Add Webhook"
 * 3. Enter your webhook URL: https://yourdomain.com/api/webhooks/resend
 * 4. Select events to receive:
 *    - email.sent
 *    - email.delivered
 *    - email.delivery_delayed
 *    - email.bounced
 *    - email.complained
 *    - email.opened
 *    - email.clicked
 * 5. Copy the signing secret and add it to your .env.local as RESEND_WEBHOOK_SECRET
 *
 * Events Handled:
 * - email.sent → Update status to 'sent'
 * - email.delivered → Update status to 'delivered', set delivered_at
 * - email.opened → Set opened_at, increment open_count
 * - email.clicked → Set first_clicked_at, increment click_count, track clicked links
 * - email.bounced → Update status to 'bounced', set error details
 * - email.complained → Update status to 'spam', set spam_reported_at
 * - email.delivery_delayed → Log warning (keep status as 'sent')
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ResendWebhookEvent } from '@/lib/resend/types';

/**
 * Verify Resend webhook signature
 *
 * @param request - Next.js request object
 * @param body - Raw request body
 * @returns True if signature is valid
 */
async function verifyWebhookSignature(
  request: NextRequest,
  body: string
): Promise<boolean> {
  const signature = request.headers.get('svix-signature');
  const timestamp = request.headers.get('svix-timestamp');
  const id = request.headers.get('svix-id');

  // If no webhook secret configured, skip verification (dev mode)
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('[resend-webhook] RESEND_WEBHOOK_SECRET not set - skipping signature verification');
    return true;
  }

  if (!signature || !timestamp || !id) {
    console.error('[resend-webhook] Missing signature headers');
    return false;
  }

  // TODO: Implement proper signature verification using Svix library
  // For now, we'll accept all webhooks if the secret is set
  // In production, use: import { Webhook } from 'svix';
  // const wh = new Webhook(webhookSecret);
  // wh.verify(body, { 'svix-signature': signature, 'svix-timestamp': timestamp, 'svix-id': id });

  return true;
}

/**
 * POST /api/webhooks/resend
 *
 * Handle incoming webhook events from Resend
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    let payload: ResendWebhookEvent;

    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error('[resend-webhook] Invalid JSON payload:', error);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Verify webhook signature
    const signatureValid = await verifyWebhookSignature(request, rawBody);

    // Log webhook event to database
    const { data: webhookEvent, error: webhookError } = await db
      .from('webhook_events')
      .insert({
        provider: 'resend',
        event_type: payload.type,
        payload: payload,
        headers: Object.fromEntries(request.headers.entries()),
        signature_valid: signatureValid,
      })
      .select('id')
      .single();

    if (webhookError) {
      console.error('[resend-webhook] Error logging webhook event:', webhookError);
    }

    // Reject if signature is invalid
    if (!signatureValid) {
      console.error('[resend-webhook] Invalid signature');

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

    console.log(`[resend-webhook] Received event: ${payload.type} for email ${payload.data.email_id}`);

    // Find the message by provider_message_id
    const { data: message, error: findError } = await db
      .from('sent_messages')
      .select('id, status, open_count, click_count, links_clicked')
      .eq('provider_message_id', payload.data.email_id)
      .maybeSingle();

    if (findError) {
      console.error('[resend-webhook] Error finding message:', findError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!message) {
      console.warn(`[resend-webhook] Message not found for email_id: ${payload.data.email_id}`);

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
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    switch (payload.type) {
      case 'email.sent':
        // Email was accepted by Resend
        if (message.status === 'queued') {
          updateData.status = 'sent';
          updateData.sent_at = payload.data.created_at;
        }
        break;

      case 'email.delivered':
        // Email was successfully delivered to recipient's server
        updateData.status = 'delivered';
        updateData.delivered_at = payload.data.created_at;
        break;

      case 'email.opened':
        // Email was opened by recipient
        updateData.opened_at = message.opened_at || payload.data.created_at; // Keep first open time
        updateData.open_count = (message.open_count || 0) + 1;

        // Upgrade status to 'opened' if currently 'delivered' or 'sent'
        if (['sent', 'delivered'].includes(message.status)) {
          updateData.status = 'opened';
        }
        break;

      case 'email.clicked':
        // Link was clicked in the email
        const clickedUrl = payload.data.link;

        updateData.first_clicked_at = message.first_clicked_at || payload.data.created_at; // Keep first click time
        updateData.click_count = (message.click_count || 0) + 1;

        // Track clicked links
        if (clickedUrl) {
          const linksClicked = (message.links_clicked as any[]) || [];
          const existingLink = linksClicked.find((link: any) => link.url === clickedUrl);

          if (existingLink) {
            existingLink.click_count = (existingLink.click_count || 0) + 1;
            existingLink.last_clicked_at = payload.data.created_at;
          } else {
            linksClicked.push({
              url: clickedUrl,
              clicked_at: payload.data.created_at,
              click_count: 1,
            });
          }

          updateData.links_clicked = linksClicked;
          updateData.unique_clicks = linksClicked.length;
        }

        // Upgrade status to 'clicked'
        updateData.status = 'clicked';
        break;

      case 'email.bounced':
        // Email bounced (could not be delivered)
        updateData.status = 'bounced';
        updateData.bounced_at = payload.data.created_at;
        updateData.bounce_type = payload.data.bounce_type || 'unknown';
        updateData.error_message = `Email bounced: ${payload.data.bounce_type || 'unknown'}`;
        break;

      case 'email.complained':
        // Recipient marked email as spam
        updateData.status = 'spam';
        updateData.spam_reported_at = payload.data.created_at;
        updateData.error_message = `Spam complaint: ${payload.data.complaint_type || 'unknown'}`;
        break;

      case 'email.delivery_delayed':
        // Delivery is delayed (temporary issue)
        console.warn(`[resend-webhook] Email delivery delayed for ${payload.data.email_id}`);
        // Don't change status, just log it
        break;

      default:
        console.warn(`[resend-webhook] Unknown event type: ${payload.type}`);
    }

    // Update the message in database
    const { error: updateError } = await db
      .from('sent_messages')
      .update(updateData)
      .eq('id', message.id);

    if (updateError) {
      console.error('[resend-webhook] Error updating message:', updateError);

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

    console.log(`[resend-webhook] Successfully processed ${payload.type} for message ${message.id}`);

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
    if (['email.opened', 'email.clicked', 'email.bounced', 'email.complained'].includes(payload.type)) {
      // Get contact_id from message
      const { data: fullMessage } = await db
        .from('sent_messages')
        .select('contact_id')
        .eq('id', message.id)
        .single();

      if (fullMessage?.contact_id) {
        let activityType = '';
        switch (payload.type) {
          case 'email.opened':
            activityType = 'email_opened';
            break;
          case 'email.clicked':
            activityType = 'email_clicked';
            break;
          case 'email.bounced':
            activityType = 'email_bounced';
            break;
          case 'email.complained':
            activityType = 'email_complained';
            break;
        }

        await db.from('activities').insert({
          contact_id: fullMessage.contact_id,
          activity_type: activityType,
          activity_data: {
            message_id: message.id,
            email_id: payload.data.email_id,
            subject: payload.data.subject,
            link: payload.data.link,
            event_time: payload.data.created_at,
          },
          related_to_type: 'message',
          related_to_id: message.id,
          occurred_at: payload.data.created_at,
          source: 'webhook',
        });
      }
    }

    // Return 200 OK to acknowledge webhook
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[resend-webhook] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
