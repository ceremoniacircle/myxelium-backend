/**
 * GET /api/admin/contacts
 *
 * List all contacts with activity statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AdminContactListItem, AdminListResponse, AdminErrorResponse } from '@/lib/types/admin';

// TODO: Add authentication middleware
// e.g., JWT token validation or API key

/**
 * GET /api/admin/contacts
 *
 * Query params:
 * - search?: string (search by email/name)
 * - consent_email?: boolean
 * - consent_sms?: boolean
 * - limit?: number (default 50, max 100)
 * - offset?: number
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate query parameters
    const search = searchParams.get('search');
    const consentEmail = searchParams.get('consent_email');
    const consentSms = searchParams.get('consent_sms');
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

    // Build query
    let query = db
      .from('contacts')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }

    // Apply consent filters
    // Note: Consent is stored as JSONB, so we need to check the structure
    // Assuming consent format: { email: { granted: boolean }, sms: { granted: boolean } }

    // Get total count
    const { count: totalCount } = await query;

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: contacts, error } = await query;

    if (error) {
      console.error('[admin/contacts] Database error:', error);
      return NextResponse.json<AdminErrorResponse>(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }

    if (!contacts) {
      return NextResponse.json<AdminListResponse<AdminContactListItem>>(
        {
          data: [],
          total: 0,
          limit,
          offset
        }
      );
    }

    // Filter by consent if specified (client-side filtering since JSONB queries are complex)
    let filteredContacts = contacts;
    if (consentEmail !== null) {
      const consentEmailBool = consentEmail === 'true';
      filteredContacts = filteredContacts.filter(c => {
        const consent = c.consent as any;
        return consent?.email?.granted === consentEmailBool;
      });
    }
    if (consentSms !== null) {
      const consentSmsBool = consentSms === 'true';
      filteredContacts = filteredContacts.filter(c => {
        const consent = c.consent as any;
        return consent?.sms?.granted === consentSmsBool;
      });
    }

    // Get activity stats for each contact
    const contactIds = filteredContacts.map(c => c.id);

    // Get event counts
    const { data: registrationCounts } = await db
      .from('registrations')
      .select('contact_id')
      .in('contact_id', contactIds);

    const eventCountsMap = new Map<string, number>();
    registrationCounts?.forEach(reg => {
      eventCountsMap.set(reg.contact_id, (eventCountsMap.get(reg.contact_id) || 0) + 1);
    });

    // Get message counts
    const { data: messageCounts } = await db
      .from('sent_messages')
      .select('contact_id')
      .in('contact_id', contactIds);

    const messageCountsMap = new Map<string, number>();
    messageCounts?.forEach(msg => {
      messageCountsMap.set(msg.contact_id, (messageCountsMap.get(msg.contact_id) || 0) + 1);
    });

    // Format response
    const formattedContacts: AdminContactListItem[] = filteredContacts.map(contact => {
      const consent = contact.consent as any;

      return {
        id: contact.id,
        email: contact.email,
        first_name: contact.first_name,
        last_name: contact.last_name,
        phone: contact.phone,
        consent_email: consent?.email?.granted ?? false,
        consent_sms: consent?.sms?.granted ?? false,
        consent_marketing: consent?.marketing?.granted ?? false,
        timezone: contact.timezone,
        total_events: eventCountsMap.get(contact.id) || 0,
        total_messages: messageCountsMap.get(contact.id) || 0,
        created_at: contact.created_at
      };
    });

    return NextResponse.json<AdminListResponse<AdminContactListItem>>(
      {
        data: formattedContacts,
        total: totalCount || 0,
        limit,
        offset
      }
    );

  } catch (error: any) {
    console.error('[admin/contacts] Unexpected error:', error);
    return NextResponse.json<AdminErrorResponse>(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
