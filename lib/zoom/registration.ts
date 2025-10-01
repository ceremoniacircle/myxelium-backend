/**
 * Zoom Registration Service
 * Handles registering contacts to Zoom events (meetings or webinars)
 */

import { zoomClient } from './client';
import { db } from '@/lib/db';

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

interface Event {
  id: string;
  title: string;
  platform: string;
  platform_event_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
}

interface RegistrationResult {
  platformRegistrantId: string;
  joinUrl: string;
  platformMetadata: any;
}

/**
 * Register a contact for a Zoom event (meeting or webinar)
 */
export async function registerContactForZoomEvent(
  contact: Contact,
  event: Event,
  formData?: Record<string, any>
): Promise<RegistrationResult> {
  // Determine if this is a meeting or webinar
  const isWebinar = event.platform === 'zoom_webinar';
  const isMeeting = event.platform === 'zoom_meeting';

  if (!isWebinar && !isMeeting) {
    throw new Error(`Unsupported platform: ${event.platform}`);
  }

  // Check if event is already created in Zoom
  let platformEventId = event.platform_event_id;

  if (!platformEventId) {
    // Event not yet created in Zoom - create it now
    platformEventId = await createZoomEvent(event);

    // Update database with platform event ID
    await db
      .from('events')
      .update({
        platform_event_id: platformEventId,
        platform_url: isWebinar
          ? `https://zoom.us/webinar/register/${platformEventId}`
          : `https://zoom.us/meeting/register/${platformEventId}`
      })
      .eq('id', event.id);
  }

  // Register the contact
  const registrantData = {
    email: contact.email,
    first_name: contact.first_name || 'Guest',
    last_name: contact.last_name || '',
    phone: contact.phone || undefined,
    custom_questions: formData ? Object.entries(formData).map(([title, value]) => ({
      title,
      value: String(value)
    })) : undefined
  };

  let result: RegistrationResult;

  if (isWebinar) {
    // Register for webinar
    const response = await zoomClient.addWebinarRegistrant(
      parseInt(platformEventId),
      registrantData
    );

    result = {
      platformRegistrantId: response.registrant_id,
      joinUrl: response.join_url,
      platformMetadata: response
    };
  } else {
    // Register for meeting
    const response = await zoomClient.addMeetingRegistrant(
      parseInt(platformEventId),
      registrantData
    );

    result = {
      platformRegistrantId: response.registrant_id,
      joinUrl: response.join_url,
      platformMetadata: response
    };
  }

  return result;
}

/**
 * Create a new event in Zoom (meeting or webinar)
 */
async function createZoomEvent(event: Event): Promise<string> {
  const isWebinar = event.platform === 'zoom_webinar';

  const commonParams = {
    topic: event.title,
    startTime: event.scheduled_at,
    duration: event.duration_minutes,
    timezone: event.timezone || 'America/Los_Angeles',
    settings: {
      approval_type: 0 as const, // Auto-approve
      registration_type: 1 as const, // Register once
      join_before_host: true,
      waiting_room: true
    }
  };

  if (isWebinar) {
    const webinar = await zoomClient.createWebinar(commonParams);
    return String(webinar.id);
  } else {
    const meeting = await zoomClient.createMeeting(commonParams);
    return String(meeting.id);
  }
}

/**
 * Get event details from Zoom
 */
export async function getZoomEventDetails(
  platformEventId: string,
  platform: 'zoom_meeting' | 'zoom_webinar'
) {
  const eventId = parseInt(platformEventId);

  if (platform === 'zoom_webinar') {
    return zoomClient.getWebinar(eventId);
  } else {
    return zoomClient.getMeeting(eventId);
  }
}
