/**
 * GET /api/admin/webhooks
 *
 * List webhook events with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AdminWebhookListItem, AdminListResponse, AdminErrorResponse } from '@/lib/types/admin';

// TODO: Add authentication middleware
// e.g., JWT token validation or API key

/**
 * GET /api/admin/webhooks
 *
 * Query params:
 * - provider?: 'resend' | 'twilio' | 'zoom'
 * - processed?: boolean
 * - signature_valid?: boolean
 * - limit?: number (default 50, max 100)
 * - offset?: number
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate query parameters
    const provider = searchParams.get('provider');
    const processed = searchParams.get('processed');
    const signatureValid = searchParams.get('signature_valid');
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

    if (provider && !['resend', 'twilio', 'zoom'].includes(provider)) {
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Invalid provider. Must be: resend, twilio, or zoom' },
        { status: 400 }
      );
    }

    // Build query
    let query = db
      .from('webhook_events')
      .select('*', { count: 'exact' });

    // Apply filters
    if (provider) {
      query = query.eq('provider', provider);
    }

    if (processed !== null) {
      query = query.eq('processed', processed === 'true');
    }

    if (signatureValid !== null) {
      query = query.eq('signature_valid', signatureValid === 'true');
    }

    // Get total count
    const { count: totalCount } = await query;

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: webhooks, error } = await query;

    if (error) {
      console.error('[admin/webhooks] Database error:', error);
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }

    if (!webhooks) {
      return NextResponse.json<AdminListResponse<AdminWebhookListItem>>(
        {
          data: [],
          total: 0,
          limit,
          offset
        }
      );
    }

    // Format response
    const formattedWebhooks: AdminWebhookListItem[] = webhooks.map(webhook => ({
      id: webhook.id,
      provider: webhook.provider,
      event_type: webhook.event_type,
      signature_valid: webhook.signature_valid,
      processed: webhook.processed,
      processed_at: webhook.processed_at,
      registration_id: webhook.registration_id,
      processing_error: webhook.processing_error,
      created_at: webhook.created_at
    }));

    return NextResponse.json<AdminListResponse<AdminWebhookListItem>>(
      {
        data: formattedWebhooks,
        total: totalCount || 0,
        limit,
        offset
      }
    );

  } catch (error: any) {
    console.error('[admin/webhooks] Unexpected error:', error);
    return NextResponse.json<AdminErrorResponse>(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
