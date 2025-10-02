/**
 * GET /api/admin/analytics/overview
 *
 * Get system-wide analytics overview
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AdminAnalyticsOverview, AdminErrorResponse } from '@/lib/types/admin';

// TODO: Add authentication middleware
// e.g., JWT token validation or API key

/**
 * GET /api/admin/analytics/overview
 *
 * Query params:
 * - start_date?: string (ISO 8601)
 * - end_date?: string (ISO 8601)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse date range
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
    const defaultEnd = now;

    const periodStart = startDate ? new Date(startDate) : defaultStart;
    const periodEnd = endDate ? new Date(endDate) : defaultEnd;

    // Validate dates
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Invalid date format. Use ISO 8601 format' },
        { status: 400 }
      );
    }

    if (periodStart > periodEnd) {
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    // Get event statistics
    const { data: allEvents } = await db
      .from('events')
      .select('id, status, created_at');

    const total_events = allEvents?.length || 0;
    const upcoming = allEvents?.filter(e => e.status === 'upcoming').length || 0;
    const completed = allEvents?.filter(e => e.status === 'completed').length || 0;
    const cancelled = allEvents?.filter(e => e.status === 'cancelled').length || 0;

    // Get contact statistics
    const { data: allContacts } = await db
      .from('contacts')
      .select('id, created_at');

    const total_contacts = allContacts?.length || 0;
    const new_this_period = allContacts?.filter(c => {
      const createdAt = new Date(c.created_at);
      return createdAt >= periodStart && createdAt <= periodEnd;
    }).length || 0;

    // Get active contacts in period (those who registered for an event)
    const { data: periodRegistrations } = await db
      .from('registrations')
      .select('contact_id, registered_at')
      .gte('registered_at', periodStart.toISOString())
      .lte('registered_at', periodEnd.toISOString());

    const active_this_period = new Set(
      periodRegistrations?.map(r => r.contact_id) || []
    ).size;

    // Get registration statistics
    const { data: allRegistrations } = await db
      .from('registrations')
      .select('id, attended');

    const total_registrations = allRegistrations?.length || 0;
    const total_attended = allRegistrations?.filter(r => r.attended === true).length || 0;
    const total_no_show = allRegistrations?.filter(r => r.attended === false).length || 0;
    const avg_attendance_rate = total_registrations > 0
      ? (total_attended / total_registrations) * 100
      : 0;

    // Get message statistics
    const { data: allMessages } = await db
      .from('sent_messages')
      .select('id, channel, status, opened_at, clicked_at');

    const total_messages = allMessages?.length || 0;
    const email_count = allMessages?.filter(m => m.channel === 'email').length || 0;
    const sms_count = allMessages?.filter(m => m.channel === 'sms').length || 0;
    const delivered_count = allMessages?.filter(m =>
      ['delivered', 'sent', 'opened', 'clicked'].includes(m.status)
    ).length || 0;
    const failed_count = allMessages?.filter(m =>
      ['failed', 'bounced', 'complained'].includes(m.status)
    ).length || 0;
    const delivery_rate = total_messages > 0
      ? (delivered_count / total_messages) * 100
      : 0;

    // Get engagement statistics (emails only)
    const email_messages = allMessages?.filter(m => m.channel === 'email') || [];
    const emails_opened = email_messages.filter(m => m.opened_at != null).length;
    const emails_clicked = email_messages.filter(m => m.clicked_at != null).length;

    const email_open_rate = email_count > 0 ? (emails_opened / email_count) * 100 : 0;
    const email_click_rate = email_count > 0 ? (emails_clicked / email_count) * 100 : 0;

    // Calculate average email opens per contact
    const { data: contactEmailStats } = await db
      .from('sent_messages')
      .select('contact_id, opened_at')
      .eq('channel', 'email')
      .not('opened_at', 'is', null);

    const contactOpenCounts = new Map<string, number>();
    contactEmailStats?.forEach(msg => {
      contactOpenCounts.set(
        msg.contact_id,
        (contactOpenCounts.get(msg.contact_id) || 0) + 1
      );
    });

    const avg_email_opens_per_contact = contactOpenCounts.size > 0
      ? Array.from(contactOpenCounts.values()).reduce((sum, count) => sum + count, 0) / contactOpenCounts.size
      : 0;

    const response: AdminAnalyticsOverview = {
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString()
      },
      events: {
        total: total_events,
        upcoming,
        completed,
        cancelled
      },
      contacts: {
        total: total_contacts,
        new_this_period,
        active_this_period
      },
      registrations: {
        total: total_registrations,
        total_attended,
        total_no_show,
        avg_attendance_rate: Math.round(avg_attendance_rate * 100) / 100
      },
      messages: {
        total: total_messages,
        email: email_count,
        sms: sms_count,
        delivered: delivered_count,
        failed: failed_count,
        delivery_rate: Math.round(delivery_rate * 100) / 100
      },
      engagement: {
        email_open_rate: Math.round(email_open_rate * 100) / 100,
        email_click_rate: Math.round(email_click_rate * 100) / 100,
        avg_email_opens_per_contact: Math.round(avg_email_opens_per_contact * 100) / 100
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[admin/analytics/overview] Unexpected error:', error);
    return NextResponse.json<AdminErrorResponse>(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
