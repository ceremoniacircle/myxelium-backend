/**
 * GET /api/admin/messages
 *
 * List sent messages with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AdminMessageListItem, AdminListResponse, AdminErrorResponse } from '@/lib/types/admin';
import { requireAdmin } from '@/lib/middleware/require-admin';

/**
 * GET /api/admin/messages
 *
 * Query params:
 * - channel?: 'email' | 'sms'
 * - status?: 'queued' | 'sent' | 'delivered' | 'failed'
 * - contact_id?: string
 * - event_id?: string
 * - limit?: number (default 50, max 100)
 * - offset?: number
 */
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate query parameters
    const channel = searchParams.get('channel');
    const status = searchParams.get('status');
    const contactId = searchParams.get('contact_id');
    const eventId = searchParams.get('event_id');
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate limit before capping
    if (limitParam < 1 || limitParam > 100) {
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    const limit = limitParam;

    if (offset < 0) {
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Offset must be non-negative' },
        { status: 400 }
      );
    }

    if (channel && !['email', 'sms'].includes(channel)) {
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Invalid channel. Must be: email or sms' },
        { status: 400 }
      );
    }

    if (status && !['queued', 'sent', 'delivered', 'failed', 'bounced', 'complained'].includes(status)) {
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Build query
    let query = db
      .from('sent_messages')
      .select(`
        id,
        contact_id,
        registration_id,
        channel,
        subject,
        status,
        sent_at,
        delivered_at,
        opened_at,
        clicked_at,
        error_message,
        contacts (
          email,
          first_name,
          last_name
        )
      `, { count: 'exact' });

    // Apply filters
    if (channel) {
      query = query.eq('channel', channel);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (contactId) {
      query = query.eq('contact_id', contactId);
    }

    // Get total count
    const { count: totalCount } = await query;

    // Apply pagination
    query = query
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: messages, error } = await query;

    if (error) {
      console.error('[admin/messages] Database error:', error);
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }

    if (!messages) {
      return NextResponse.json<AdminListResponse<AdminMessageListItem>>(
        {
          data: [],
          total: 0,
          limit,
          offset
        }
      );
    }

    // If filtering by event_id, we need to get registration IDs first
    let messageIds = messages.map(m => m.id);
    if (eventId) {
      const { data: registrations } = await db
        .from('registrations')
        .select('id')
        .eq('event_id', eventId);

      const registrationIds = registrations?.map(r => r.id) || [];

      // Filter messages by registration IDs
      const filteredMessages = messages.filter(m =>
        m.registration_id && registrationIds.includes(m.registration_id)
      );
      messageIds = filteredMessages.map(m => m.id);
    }

    // Get event titles for messages with registrations
    const registrationIds = messages
      .filter(m => m.registration_id)
      .map(m => m.registration_id as string);

    const { data: registrations } = await db
      .from('registrations')
      .select(`
        id,
        events (
          title
        )
      `)
      .in('id', registrationIds);

    const eventTitlesMap = new Map<string, string>();
    registrations?.forEach(reg => {
      const event = reg.events as any;
      eventTitlesMap.set(reg.id, event?.title || null);
    });

    // Format response
    const formattedMessages: AdminMessageListItem[] = messages
      .filter(m => !eventId || messageIds.includes(m.id))
      .map(msg => {
        const contact = msg.contacts as any;
        const contact_name = [contact?.first_name, contact?.last_name]
          .filter(Boolean)
          .join(' ') || 'N/A';

        return {
          id: msg.id,
          contact_email: contact?.email || '',
          contact_name,
          channel: msg.channel,
          subject: msg.subject,
          status: msg.status,
          sent_at: msg.sent_at,
          delivered_at: msg.delivered_at,
          opened_at: msg.opened_at,
          clicked_at: msg.clicked_at,
          error_message: msg.error_message,
          event_title: msg.registration_id ? eventTitlesMap.get(msg.registration_id) || null : null
        };
      });

    return NextResponse.json<AdminListResponse<AdminMessageListItem>>(
      {
        data: formattedMessages,
        total: totalCount || 0,
        limit,
        offset
      }
    );

  } catch (error: any) {
    console.error('[admin/messages] Unexpected error:', error);
    return NextResponse.json<AdminErrorResponse>(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
});
