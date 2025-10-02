/**
 * POST /api/admin/messages/send
 *
 * Manually send a message for testing purposes
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resend, DEFAULT_FROM } from '@/lib/resend/client';
import { twilioClient, TWILIO_PHONE_NUMBER } from '@/lib/twilio/client';
import { AdminSendMessageRequest, AdminSendMessageResponse, AdminErrorResponse } from '@/lib/types/admin';
import { requireAdmin } from '@/lib/middleware/require-admin';

/**
 * POST /api/admin/messages/send
 */
export const POST = requireAdmin(async (request: NextRequest) => {
  try {
    const body: AdminSendMessageRequest = await request.json();

    // Validate required fields
    if (!body.contact_id || !body.channel || !body.content) {
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Missing required fields: contact_id, channel, content' },
        { status: 400 }
      );
    }

    if (!['email', 'sms'].includes(body.channel)) {
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Invalid channel. Must be: email or sms' },
        { status: 400 }
      );
    }

    // Get contact
    const { data: contact, error: contactError } = await db
      .from('contacts')
      .select('*')
      .eq('id', body.contact_id)
      .maybeSingle();

    if (contactError) {
      console.error('[admin/messages/send] Database error:', contactError);
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Internal server error', details: contactError.message },
        { status: 500 }
      );
    }

    if (!contact) {
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Check consent
    const consent = contact.consent as any;
    if (body.channel === 'email' && !consent?.email?.granted) {
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Contact has not consented to email communications' },
        { status: 400 }
      );
    }

    if (body.channel === 'sms' && !consent?.sms?.granted) {
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Contact has not consented to SMS communications' },
        { status: 400 }
      );
    }

    let provider_message_id: string | undefined;
    let status = 'queued';

    try {
      if (body.channel === 'email') {
        // Send email via Resend
        if (!contact.email) {
          return NextResponse.json<AdminErrorResponse>(
            { error: 'Contact does not have an email address' },
            { status: 400 }
          );
        }

        const { data, error } = await resend.emails.send({
          from: DEFAULT_FROM,
          to: contact.email,
          subject: body.subject || 'Test Message',
          html: body.content,
        });

        if (error) {
          throw new Error(error.message);
        }

        provider_message_id = data?.id;
        status = 'sent';

      } else if (body.channel === 'sms') {
        // Send SMS via Twilio
        if (!contact.phone) {
          return NextResponse.json<AdminErrorResponse>(
            { error: 'Contact does not have a phone number' },
            { status: 400 }
          );
        }

        if (!TWILIO_PHONE_NUMBER) {
          return NextResponse.json<AdminErrorResponse>(
            { error: 'Twilio is not configured' },
            { status: 500 }
          );
        }

        const message = await twilioClient.messages.create({
          from: TWILIO_PHONE_NUMBER,
          to: contact.phone,
          body: body.content,
        });

        provider_message_id = message.sid;
        status = 'sent';
      }

    } catch (sendError: any) {
      console.error('[admin/messages/send] Send error:', sendError);
      status = 'failed';
    }

    // Create message record
    const { data: messageRecord, error: insertError } = await db
      .from('sent_messages')
      .insert({
        contact_id: body.contact_id,
        channel: body.channel,
        provider: body.channel === 'email' ? 'resend' : 'twilio',
        template_id: body.template_id,
        subject: body.subject,
        content: body.content,
        status,
        provider_message_id,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[admin/messages/send] Insert error:', insertError);
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Failed to record message', details: insertError.message },
        { status: 500 }
      );
    }

    // Log activity
    await db.from('activities').insert({
      contact_id: body.contact_id,
      activity_type: 'message_sent_manually',
      activity_data: {
        message_id: messageRecord.id,
        channel: body.channel,
        subject: body.subject
      },
      related_to_type: 'sent_message',
      related_to_id: messageRecord.id,
      source: 'admin'
    });

    const response: AdminSendMessageResponse = {
      success: status !== 'failed',
      message_id: messageRecord.id,
      provider_message_id,
      status
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[admin/messages/send] Unexpected error:', error);
    return NextResponse.json<AdminErrorResponse>(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
});
