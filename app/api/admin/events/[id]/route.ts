/**
 * GET /api/admin/events/[id]
 *
 * Get detailed event information with statistics and recent registrations
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AdminEventDetails, AdminErrorResponse } from '@/lib/types/admin';

// TODO: Add authentication middleware
// e.g., JWT token validation or API key

/**
 * GET /api/admin/events/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get event details
    const { data: event, error: eventError } = await db
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (eventError) {
      console.error('[admin/events/[id]] Database error:', eventError);
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Internal server error', details: eventError.message },
        { status: 500 }
      );
    }

    if (!event) {
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get all registrations for this event
    const { data: registrations, error: regError } = await db
      .from('registrations')
      .select(`
        id,
        contact_id,
        registered_at,
        attended,
        attended_at,
        attendance_duration_minutes,
        status,
        contacts (
          email,
          first_name,
          last_name
        )
      `)
      .eq('event_id', id)
      .order('registered_at', { ascending: false });

    if (regError) {
      console.error('[admin/events/[id]] Database error:', regError);
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Internal server error', details: regError.message },
        { status: 500 }
      );
    }

    // Get message stats for this event
    const { data: messages, error: msgError } = await db
      .from('sent_messages')
      .select('id, channel, status, opened_at, clicked_at')
      .eq('registration_id', registrations?.map(r => r.id) || []);

    if (msgError) {
      console.error('[admin/events/[id]] Message stats error:', msgError);
    }

    // Calculate statistics
    const total_registrations = registrations?.length || 0;
    const attended = registrations?.filter(r => r.attended === true).length || 0;
    const no_show = registrations?.filter(r => r.attended === false).length || 0;
    const attendance_rate = total_registrations > 0 ? (attended / total_registrations) * 100 : 0;

    const attendanceDurations = registrations
      ?.filter(r => r.attendance_duration_minutes != null)
      .map(r => r.attendance_duration_minutes as number) || [];

    const avg_attendance_duration = attendanceDurations.length > 0
      ? attendanceDurations.reduce((sum, d) => sum + d, 0) / attendanceDurations.length
      : 0;

    const messages_sent = messages?.length || 0;
    const emails_sent = messages?.filter(m => m.channel === 'email').length || 0;
    const sms_sent = messages?.filter(m => m.channel === 'sms').length || 0;

    const email_messages = messages?.filter(m => m.channel === 'email') || [];
    const emails_opened = email_messages.filter(m => m.opened_at != null).length;
    const emails_clicked = email_messages.filter(m => m.clicked_at != null).length;

    const email_open_rate = emails_sent > 0 ? (emails_opened / emails_sent) * 100 : 0;
    const email_click_rate = emails_sent > 0 ? (emails_clicked / emails_sent) * 100 : 0;

    // Format recent registrations (limit to 50 most recent)
    const recent_registrations = registrations?.slice(0, 50).map(reg => {
      const contact = reg.contacts as any;
      const contact_name = [contact?.first_name, contact?.last_name]
        .filter(Boolean)
        .join(' ') || 'N/A';

      return {
        id: reg.id,
        contact_id: reg.contact_id,
        contact_email: contact?.email || '',
        contact_name,
        registered_at: reg.registered_at,
        attended: reg.attended,
        attended_at: reg.attended_at,
        attendance_duration_minutes: reg.attendance_duration_minutes,
        status: reg.status
      };
    }) || [];

    const response: AdminEventDetails = {
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        scheduled_at: event.scheduled_at,
        timezone: event.timezone,
        duration_minutes: event.duration_minutes,
        platform: event.platform,
        platform_event_id: event.platform_event_id,
        join_url: event.join_url,
        status: event.status,
        created_at: event.created_at,
        updated_at: event.updated_at
      },
      stats: {
        total_registrations,
        attended,
        no_show,
        attendance_rate: Math.round(attendance_rate * 100) / 100,
        avg_attendance_duration: Math.round(avg_attendance_duration * 100) / 100,
        messages_sent,
        emails_sent,
        sms_sent,
        email_open_rate: Math.round(email_open_rate * 100) / 100,
        email_click_rate: Math.round(email_click_rate * 100) / 100
      },
      recent_registrations
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[admin/events/[id]] Unexpected error:', error);
    return NextResponse.json<AdminErrorResponse>(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
