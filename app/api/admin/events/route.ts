/**
 * GET /api/admin/events
 *
 * List all events with enrollment and attendance statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AdminEventListItem, AdminListResponse, AdminErrorResponse } from '@/lib/types/admin';
import { requireAdmin } from '@/lib/middleware/require-admin';

/**
 * GET /api/admin/events
 *
 * Query params:
 * - status?: 'upcoming' | 'completed' | 'cancelled'
 * - limit?: number (default 50, max 100)
 * - offset?: number (for pagination)
 * - sort?: 'scheduled_at' | 'created_at' (default 'scheduled_at')
 * - order?: 'asc' | 'desc' (default 'desc')
 */
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate query parameters
    const status = searchParams.get('status');
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') || 'scheduled_at';
    const order = searchParams.get('order') || 'desc';

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

    if (status && !['upcoming', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Invalid status. Must be: upcoming, completed, or cancelled' },
        { status: 400 }
      );
    }

    if (!['scheduled_at', 'created_at'].includes(sort)) {
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Invalid sort field. Must be: scheduled_at or created_at' },
        { status: 400 }
      );
    }

    if (!['asc', 'desc'].includes(order)) {
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Invalid order. Must be: asc or desc' },
        { status: 400 }
      );
    }

    // Build query
    let query = db
      .from('events')
      .select(`
        id,
        title,
        description,
        scheduled_at,
        timezone,
        duration_minutes,
        platform,
        status,
        created_at
      `, { count: 'exact' });

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Get total count
    const { count: totalCount } = await query;

    // Apply sorting and pagination
    query = query
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: events, error } = await query;

    if (error) {
      console.error('[admin/events] Database error:', error);
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }

    if (!events) {
      return NextResponse.json<AdminListResponse<AdminEventListItem>>(
        {
          data: [],
          total: 0,
          limit,
          offset
        }
      );
    }

    // Get enrollment and attendance stats for each event
    const eventIds = events.map(e => e.id);

    const { data: registrationStats } = await db
      .from('registrations')
      .select('event_id, attended')
      .in('event_id', eventIds);

    // Calculate stats per event
    const statsMap = new Map<string, { enrollment_count: number; attendance_count: number }>();

    eventIds.forEach(id => {
      statsMap.set(id, { enrollment_count: 0, attendance_count: 0 });
    });

    registrationStats?.forEach(reg => {
      const stats = statsMap.get(reg.event_id);
      if (stats) {
        stats.enrollment_count++;
        if (reg.attended === true) {
          stats.attendance_count++;
        }
      }
    });

    // Format response
    const formattedEvents: AdminEventListItem[] = events.map(event => {
      const stats = statsMap.get(event.id) || { enrollment_count: 0, attendance_count: 0 };
      const attendance_rate = stats.enrollment_count > 0
        ? (stats.attendance_count / stats.enrollment_count) * 100
        : 0;

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        scheduled_at: event.scheduled_at,
        timezone: event.timezone,
        duration_minutes: event.duration_minutes,
        platform: event.platform,
        status: event.status,
        enrollment_count: stats.enrollment_count,
        attendance_count: stats.attendance_count,
        attendance_rate: Math.round(attendance_rate * 100) / 100,
        created_at: event.created_at
      };
    });

    return NextResponse.json<AdminListResponse<AdminEventListItem>>(
      {
        data: formattedEvents,
        total: totalCount || 0,
        limit,
        offset
      }
    );

  } catch (error: any) {
    console.error('[admin/events] Unexpected error:', error);
    return NextResponse.json<AdminErrorResponse>(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
});
