/**
 * POST /api/enrollments
 *
 * Enrolls a contact in an event:
 * 1. Creates or updates contact record
 * 2. Creates event registration
 * 3. Registers with external platform (Zoom, etc.) - TODO
 * 4. Triggers drip campaign - TODO
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EnrollmentRequest, EnrollmentResponse } from '@/lib/types/api';

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Create or update contact
 */
async function upsertContact(data: EnrollmentRequest) {
  const { email, firstName, lastName, phone, consent } = data;

  // Check if contact exists
  const { data: existingContact } = await db
    .from('contacts')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingContact) {
    // Update existing contact
    const { data: updatedContact, error } = await db
      .from('contacts')
      .update({
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        phone: phone || undefined,
        consent: consent ? {
          email: { granted: consent.email ?? true, updated_at: new Date().toISOString() },
          sms: { granted: consent.sms ?? false, updated_at: new Date().toISOString() },
          marketing: { granted: consent.marketing ?? true, updated_at: new Date().toISOString() }
        } : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingContact.id)
      .select()
      .single();

    if (error) throw error;
    return updatedContact;
  } else {
    // Create new contact
    const { data: newContact, error } = await db
      .from('contacts')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        consent: {
          email: { granted: consent?.email ?? true, updated_at: new Date().toISOString() },
          sms: { granted: consent?.sms ?? false, updated_at: new Date().toISOString() },
          marketing: { granted: consent?.marketing ?? true, updated_at: new Date().toISOString() }
        },
        lifecycle_stage: 'lead',
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return newContact;
  }
}

/**
 * Create event registration
 */
async function createRegistration(
  contactId: string,
  eventId: string,
  data: EnrollmentRequest
) {
  const { source, sourceUrl, utmParams, formData } = data;

  // Check if registration already exists
  const { data: existingReg } = await db
    .from('registrations')
    .select('id, status')
    .eq('contact_id', contactId)
    .eq('event_id', eventId)
    .maybeSingle();

  if (existingReg) {
    // If cancelled, reactivate
    if (existingReg.status === 'cancelled') {
      const { data: updatedReg, error } = await db
        .from('registrations')
        .update({
          status: 'registered',
          registered_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingReg.id)
        .select()
        .single();

      if (error) throw error;
      return updatedReg;
    }

    // Already registered
    return existingReg;
  }

  // Create new registration
  const { data: registration, error } = await db
    .from('registrations')
    .insert({
      contact_id: contactId,
      event_id: eventId,
      registration_source: source || 'landing_page',
      source_url: sourceUrl,
      utm_params: utmParams || {},
      form_data: formData || {},
      status: 'registered'
    })
    .select()
    .single();

  if (error) throw error;
  return registration;
}

/**
 * Log activity
 */
async function logActivity(
  contactId: string,
  eventId: string,
  registrationId: string,
  eventTitle: string
) {
  await db.from('activities').insert({
    contact_id: contactId,
    activity_type: 'event_registered',
    activity_data: {
      event_id: eventId,
      event_title: eventTitle,
      registration_id: registrationId
    },
    related_to_type: 'registration',
    related_to_id: registrationId,
    source: 'api'
  });
}

/**
 * GET /api/enrollments?email={email}&eventId={eventId}
 *
 * Get enrollment status for a contact
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const eventId = searchParams.get('eventId');

    if (!email || !eventId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required query parameters: email and eventId'
          }
        },
        { status: 400 }
      );
    }

    // Get contact
    const { data: contact } = await db
      .from('contacts')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (!contact) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No enrollment found'
          }
        },
        { status: 404 }
      );
    }

    // Get registration
    const { data: registration } = await db
      .from('registrations')
      .select(`
        id,
        status,
        attended,
        platform_join_url,
        registered_at,
        events (
          id,
          title,
          scheduled_at,
          platform
        )
      `)
      .eq('contact_id', contact.id)
      .eq('event_id', eventId)
      .maybeSingle();

    if (!registration) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No enrollment found'
          }
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        registrationId: registration.id,
        status: registration.status,
        attended: registration.attended,
        joinUrl: registration.platform_join_url,
        registeredAt: registration.registered_at,
        event: registration.events
      }
    });

  } catch (error: any) {
    console.error('Get enrollment error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'An unexpected error occurred'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/enrollments
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: EnrollmentRequest = await request.json();

    // Validate required fields
    if (!body.email || !body.eventId) {
      return NextResponse.json<EnrollmentResponse>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: email and eventId',
            details: { fields: ['email', 'eventId'] }
          }
        },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(body.email)) {
      return NextResponse.json<EnrollmentResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_EMAIL',
            message: 'Invalid email format'
          }
        },
        { status: 400 }
      );
    }

    // Verify event exists
    const { data: event, error: eventError } = await db
      .from('events')
      .select('id, title, platform, status, current_registrations, max_registrations')
      .eq('id', body.eventId)
      .maybeSingle();

    if (eventError || !event) {
      return NextResponse.json<EnrollmentResponse>(
        {
          success: false,
          error: {
            code: 'EVENT_NOT_FOUND',
            message: `Event not found: ${body.eventId}`
          }
        },
        { status: 404 }
      );
    }

    // Check if event is full
    if (event.max_registrations && event.current_registrations >= event.max_registrations) {
      return NextResponse.json<EnrollmentResponse>(
        {
          success: false,
          error: {
            code: 'EVENT_FULL',
            message: 'Event has reached maximum capacity'
          }
        },
        { status: 400 }
      );
    }

    // Check event status
    if (event.status === 'cancelled' || event.status === 'completed') {
      return NextResponse.json<EnrollmentResponse>(
        {
          success: false,
          error: {
            code: 'EVENT_NOT_AVAILABLE',
            message: `Event is ${event.status}`
          }
        },
        { status: 400 }
      );
    }

    // Create/update contact
    const contact = await upsertContact(body);

    // Create registration
    const registration = await createRegistration(contact.id, event.id, body);

    // Log activity
    await logActivity(contact.id, event.id, registration.id, event.title);

    // TODO: Register with external platform (Zoom, Calendly, etc.)
    // TODO: Trigger pre-event drip campaign via Inngest

    // Return success response
    return NextResponse.json<EnrollmentResponse>(
      {
        success: true,
        data: {
          registrationId: registration.id,
          contactId: contact.id,
          eventId: event.id,
          message: `Successfully registered for ${event.title}`
        }
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Enrollment error:', error);

    // Handle specific database errors
    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json<EnrollmentResponse>(
        {
          success: false,
          error: {
            code: 'ALREADY_REGISTERED',
            message: 'Contact is already registered for this event'
          }
        },
        { status: 409 }
      );
    }

    // Generic error
    return NextResponse.json<EnrollmentResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'An unexpected error occurred',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }
      },
      { status: 500 }
    );
  }
}
