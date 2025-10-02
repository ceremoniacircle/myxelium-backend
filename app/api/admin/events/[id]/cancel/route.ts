/**
 * POST /api/admin/events/[id]/cancel
 *
 * Cancel an event and stop all pending campaigns
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inngest } from '@/inngest/client';
import { AdminErrorResponse } from '@/lib/types/admin';
import { requireAdmin } from '@/lib/middleware/require-admin';

interface CancelEventRequest {
  reason?: string;
}

interface CancelEventResponse {
  success: boolean;
  event_id: string;
  cancelled_jobs: number;
  message: string;
}

/**
 * POST /api/admin/events/[id]/cancel
 */
export const POST = requireAdmin(async (
  request: NextRequest,
  { params }: { params?: Promise<{ id: string }> }
) => {
  if (!params) {
    return NextResponse.json<AdminErrorResponse>(
      { error: 'Missing event ID' },
      { status: 400 }
    );
  }
  try {
    const { id } = await params;
    const body: CancelEventRequest = await request.json().catch(() => ({}));

    // Verify event exists
    const { data: event, error: eventError } = await db
      .from('events')
      .select('id, title, status')
      .eq('id', id)
      .maybeSingle();

    if (eventError) {
      console.error('[admin/events/cancel] Database error:', eventError);
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

    if (event.status === 'cancelled') {
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Event is already cancelled' },
        { status: 400 }
      );
    }

    // Update event status
    const { error: updateError } = await db
      .from('events')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('[admin/events/cancel] Update error:', updateError);
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Failed to cancel event', details: updateError.message },
        { status: 500 }
      );
    }

    // Get all registrations for this event
    const { data: registrations } = await db
      .from('registrations')
      .select('id')
      .eq('event_id', id);

    // Cancel pending Inngest jobs for this event
    // Note: Inngest doesn't provide a direct API to cancel jobs programmatically
    // This is a placeholder for future implementation when Inngest supports it
    let cancelledJobs = 0;

    // TODO: Implement Inngest job cancellation when API is available
    // For now, we rely on the functions checking event status before executing

    console.log(`[admin/events/cancel] Event ${id} cancelled. ${registrations?.length || 0} registrations affected.`);

    // Log activity for the cancellation
    await db.from('activities').insert({
      contact_id: null, // System activity
      activity_type: 'event_cancelled',
      activity_data: {
        event_id: id,
        event_title: event.title,
        reason: body.reason,
        affected_registrations: registrations?.length || 0
      },
      related_to_type: 'event',
      related_to_id: id,
      source: 'admin'
    });

    const response: CancelEventResponse = {
      success: true,
      event_id: id,
      cancelled_jobs: cancelledJobs,
      message: `Event cancelled successfully. ${registrations?.length || 0} registrations affected.`
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[admin/events/cancel] Unexpected error:', error);
    return NextResponse.json<AdminErrorResponse>(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
});
