/**
 * GET /api/admin/analytics/events/[id]
 *
 * Get event-specific analytics with funnel metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AdminEventAnalytics, AdminErrorResponse } from '@/lib/types/admin';

// TODO: Add authentication middleware
// e.g., JWT token validation or API key

/**
 * GET /api/admin/analytics/events/[id]
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
      .select('id, title, scheduled_at')
      .eq('id', id)
      .maybeSingle();

    if (eventError) {
      console.error('[admin/analytics/events/[id]] Database error:', eventError);
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
    const { data: registrations } = await db
      .from('registrations')
      .select('id, attended')
      .eq('event_id', id);

    const total_registrations = registrations?.length || 0;
    const attended = registrations?.filter(r => r.attended === true).length || 0;
    const no_show = registrations?.filter(r => r.attended === false).length || 0;
    const attendance_rate = total_registrations > 0
      ? (attended / total_registrations) * 100
      : 0;

    // Get all messages for this event's registrations
    const registrationIds = registrations?.map(r => r.id) || [];

    const { data: messages } = await db
      .from('sent_messages')
      .select('id, template_id, status, opened_at, clicked_at')
      .in('registration_id', registrationIds);

    // Categorize messages by campaign step
    // Template IDs should follow pattern: welcome, reminder-24h, reminder-1h, post-event, etc.
    const welcomeMessages = messages?.filter(m =>
      m.template_id?.includes('welcome') || m.template_id?.includes('confirmation')
    ) || [];

    const reminder24hMessages = messages?.filter(m =>
      m.template_id?.includes('24h') || m.template_id?.includes('24-hour')
    ) || [];

    const reminder1hMessages = messages?.filter(m =>
      m.template_id?.includes('1h') || m.template_id?.includes('1-hour')
    ) || [];

    const postEventMessages = messages?.filter(m =>
      m.template_id?.includes('post') || m.template_id?.includes('followup')
    ) || [];

    // Calculate welcome email stats
    const welcome_emails_sent = welcomeMessages.length;
    const welcome_emails_opened = welcomeMessages.filter(m => m.opened_at != null).length;
    const welcome_email_open_rate = welcome_emails_sent > 0
      ? (welcome_emails_opened / welcome_emails_sent) * 100
      : 0;

    // Build timeline
    const timeline = [
      {
        step: 'Registration Confirmation',
        sent: welcomeMessages.length,
        delivered: welcomeMessages.filter(m => ['delivered', 'sent', 'opened', 'clicked'].includes(m.status)).length,
        opened: welcomeMessages.filter(m => m.opened_at != null).length,
        clicked: welcomeMessages.filter(m => m.clicked_at != null).length
      },
      {
        step: '24-Hour Reminder',
        sent: reminder24hMessages.length,
        delivered: reminder24hMessages.filter(m => ['delivered', 'sent', 'opened', 'clicked'].includes(m.status)).length,
        opened: reminder24hMessages.filter(m => m.opened_at != null).length,
        clicked: reminder24hMessages.filter(m => m.clicked_at != null).length
      },
      {
        step: '1-Hour Reminder',
        sent: reminder1hMessages.length,
        delivered: reminder1hMessages.filter(m => ['delivered', 'sent', 'opened', 'clicked'].includes(m.status)).length,
        opened: reminder1hMessages.filter(m => m.opened_at != null).length,
        clicked: reminder1hMessages.filter(m => m.clicked_at != null).length
      },
      {
        step: 'Event Attendance',
        sent: total_registrations,
        delivered: attended,
        opened: 0, // Not applicable
        clicked: 0 // Not applicable
      },
      {
        step: 'Post-Event Follow-up',
        sent: postEventMessages.length,
        delivered: postEventMessages.filter(m => ['delivered', 'sent', 'opened', 'clicked'].includes(m.status)).length,
        opened: postEventMessages.filter(m => m.opened_at != null).length,
        clicked: postEventMessages.filter(m => m.clicked_at != null).length
      }
    ];

    const response: AdminEventAnalytics = {
      event: {
        id: event.id,
        title: event.title,
        scheduled_at: event.scheduled_at
      },
      funnel_metrics: {
        registrations: total_registrations,
        welcome_emails_sent,
        welcome_email_open_rate: Math.round(welcome_email_open_rate * 100) / 100,
        reminder_24h_sent: reminder24hMessages.length,
        reminder_1h_sent: reminder1hMessages.length,
        attended,
        no_show,
        attendance_rate: Math.round(attendance_rate * 100) / 100,
        post_event_emails_sent: postEventMessages.length
      },
      timeline
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[admin/analytics/events/[id]] Unexpected error:', error);
    return NextResponse.json<AdminErrorResponse>(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
