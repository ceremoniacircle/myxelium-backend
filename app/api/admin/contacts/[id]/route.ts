/**
 * GET /api/admin/contacts/[id]
 *
 * Get detailed contact information with statistics and activity history
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AdminContactDetails, AdminErrorResponse } from '@/lib/types/admin';

// TODO: Add authentication middleware
// e.g., JWT token validation or API key

/**
 * GET /api/admin/contacts/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get contact details
    const { data: contact, error: contactError } = await db
      .from('contacts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (contactError) {
      console.error('[admin/contacts/[id]] Database error:', contactError);
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

    // Get event registrations
    const { data: registrations, error: regError } = await db
      .from('registrations')
      .select(`
        id,
        registered_at,
        attended,
        attendance_duration_minutes,
        events (
          id,
          title,
          scheduled_at
        )
      `)
      .eq('contact_id', id)
      .order('registered_at', { ascending: false });

    if (regError) {
      console.error('[admin/contacts/[id]] Registrations error:', regError);
    }

    // Get messages
    const { data: messages, error: msgError } = await db
      .from('sent_messages')
      .select('id, channel, subject, sent_at, status, opened_at, clicked_at')
      .eq('contact_id', id)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (msgError) {
      console.error('[admin/contacts/[id]] Messages error:', msgError);
    }

    // Get activities
    const { data: activities, error: actError } = await db
      .from('activities')
      .select('id, activity_type, activity_data, occurred_at, source')
      .eq('contact_id', id)
      .order('occurred_at', { ascending: false })
      .limit(50);

    if (actError) {
      console.error('[admin/contacts/[id]] Activities error:', actError);
    }

    // Calculate statistics
    const total_events = registrations?.length || 0;
    const events_attended = registrations?.filter(r => r.attended === true).length || 0;
    const events_no_show = registrations?.filter(r => r.attended === false).length || 0;
    const attendance_rate = total_events > 0 ? (events_attended / total_events) * 100 : 0;

    const total_messages = messages?.length || 0;
    const emails_received = messages?.filter(m => m.channel === 'email').length || 0;
    const sms_received = messages?.filter(m => m.channel === 'sms').length || 0;

    const email_messages = messages?.filter(m => m.channel === 'email') || [];
    const emails_opened = email_messages.filter(m => m.opened_at != null).length;
    const email_open_rate = emails_received > 0 ? (emails_opened / emails_received) * 100 : 0;

    // Format recent events
    const recent_events = registrations?.slice(0, 10).map(reg => {
      const event = reg.events as any;
      return {
        id: event?.id || '',
        title: event?.title || 'Unknown Event',
        scheduled_at: event?.scheduled_at || '',
        registered_at: reg.registered_at,
        attended: reg.attended,
        attendance_duration_minutes: reg.attendance_duration_minutes
      };
    }) || [];

    // Format recent messages
    const recent_messages = messages?.slice(0, 10).map(msg => ({
      id: msg.id,
      channel: msg.channel,
      subject: msg.subject,
      sent_at: msg.sent_at,
      status: msg.status,
      opened_at: msg.opened_at,
      clicked_at: msg.clicked_at
    })) || [];

    // Format recent activities
    const recent_activities = activities?.slice(0, 10).map(act => ({
      id: act.id,
      activity_type: act.activity_type,
      activity_data: act.activity_data,
      occurred_at: act.occurred_at,
      source: act.source
    })) || [];

    // Extract consent info
    const consent = contact.consent as any;

    const response: AdminContactDetails = {
      contact: {
        id: contact.id,
        email: contact.email,
        first_name: contact.first_name,
        last_name: contact.last_name,
        phone: contact.phone,
        consent_email: consent?.email?.granted ?? false,
        consent_sms: consent?.sms?.granted ?? false,
        consent_marketing: consent?.marketing?.granted ?? false,
        timezone: contact.timezone,
        created_at: contact.created_at,
        updated_at: contact.updated_at
      },
      stats: {
        total_events,
        events_attended,
        events_no_show,
        attendance_rate: Math.round(attendance_rate * 100) / 100,
        total_messages,
        emails_received,
        sms_received,
        email_open_rate: Math.round(email_open_rate * 100) / 100
      },
      recent_events,
      recent_messages,
      recent_activities
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[admin/contacts/[id]] Unexpected error:', error);
    return NextResponse.json<AdminErrorResponse>(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
