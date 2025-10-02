/**
 * Add-to-Calendar Link Generator
 *
 * Generate "Add to Calendar" links for major calendar providers:
 * - Google Calendar
 * - Outlook (Web)
 * - Apple Calendar (iCal)
 * - Yahoo Calendar
 */

import type { CalendarEvent, CalendarLinks, EventData, RegistrationData, ContactData } from './types';

/**
 * Format date for URL parameters (YYYYMMDDTHHMMSSZ format in UTC)
 *
 * @param date - Date object
 * @returns Formatted date string for calendar URLs
 */
function formatDateForURL(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Generate Google Calendar "Add Event" link
 *
 * @param event - Calendar event data
 * @returns Google Calendar URL
 *
 * @example
 * ```typescript
 * const url = generateGoogleCalendarLink({
 *   title: 'AI Workshop',
 *   startTime: '2025-10-01T14:00:00Z',
 *   durationMinutes: 60,
 *   location: 'https://zoom.us/j/123456789',
 *   description: 'Learn about AI'
 * });
 * ```
 */
export function generateGoogleCalendarLink(event: CalendarEvent): string {
  const startDate = new Date(event.startTime);
  const endDate = new Date(startDate.getTime() + event.durationMinutes * 60000);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDateForURL(startDate)}/${formatDateForURL(endDate)}`,
  });

  if (event.description) {
    params.set('details', event.description);
  }

  if (event.location) {
    params.set('location', event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Web "Add Event" link
 *
 * @param event - Calendar event data
 * @returns Outlook Web URL
 *
 * @example
 * ```typescript
 * const url = generateOutlookLink({
 *   title: 'AI Workshop',
 *   startTime: '2025-10-01T14:00:00Z',
 *   durationMinutes: 60,
 *   location: 'https://zoom.us/j/123456789'
 * });
 * ```
 */
export function generateOutlookLink(event: CalendarEvent): string {
  const startDate = new Date(event.startTime);
  const endDate = new Date(startDate.getTime() + event.durationMinutes * 60000);

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: startDate.toISOString(),
    enddt: endDate.toISOString(),
  });

  if (event.description) {
    params.set('body', event.description);
  }

  if (event.location) {
    params.set('location', event.location);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Yahoo Calendar "Add Event" link
 *
 * @param event - Calendar event data
 * @returns Yahoo Calendar URL
 *
 * @example
 * ```typescript
 * const url = generateYahooCalendarLink({
 *   title: 'AI Workshop',
 *   startTime: '2025-10-01T14:00:00Z',
 *   durationMinutes: 60
 * });
 * ```
 */
export function generateYahooCalendarLink(event: CalendarEvent): string {
  const startDate = new Date(event.startTime);
  const endDate = new Date(startDate.getTime() + event.durationMinutes * 60000);

  const params = new URLSearchParams({
    v: '60',
    title: event.title,
    st: formatDateForURL(startDate),
    et: formatDateForURL(endDate),
  });

  if (event.description) {
    params.set('desc', event.description);
  }

  if (event.location) {
    params.set('in_loc', event.location);
  }

  return `https://calendar.yahoo.com/?${params.toString()}`;
}

/**
 * Generate Apple Calendar link (returns the .ics download link)
 * Apple Calendar doesn't have a web interface with direct links,
 * so we provide a data URL with the .ics content
 *
 * @param icsContent - ICS file content
 * @returns Data URL for .ics file
 */
export function generateAppleCalendarLink(icsContent: string): string {
  const base64Content = Buffer.from(icsContent, 'utf-8').toString('base64');
  return `data:text/calendar;base64,${base64Content}`;
}

/**
 * Generate all calendar provider links from calendar event
 *
 * @param event - Calendar event data
 * @param icsContent - ICS file content (for Apple Calendar)
 * @returns Object with links for all calendar providers
 *
 * @example
 * ```typescript
 * const links = generateAllCalendarLinks(event, icsContent);
 * console.log(links.google);  // Google Calendar URL
 * console.log(links.outlook); // Outlook URL
 * console.log(links.apple);   // Apple Calendar data URL
 * console.log(links.yahoo);   // Yahoo Calendar URL
 * ```
 */
export function generateAllCalendarLinks(
  event: CalendarEvent,
  icsContent: string
): CalendarLinks {
  return {
    google: generateGoogleCalendarLink(event),
    outlook: generateOutlookLink(event),
    apple: generateAppleCalendarLink(icsContent),
    yahoo: generateYahooCalendarLink(event),
  };
}

/**
 * Generate calendar links from event and registration data
 * Convenience function that builds CalendarEvent from database records
 *
 * @param eventData - Event data from database
 * @param registrationData - Registration data from database
 * @param contactData - Contact data from database
 * @param icsContent - ICS file content (for Apple Calendar link)
 * @returns Object with links for all calendar providers
 */
export function generateCalendarLinksFromRegistration(
  eventData: EventData,
  registrationData: RegistrationData,
  contactData: ContactData,
  icsContent: string
): CalendarLinks {
  // Build join URL (prefer registration-specific URL)
  const joinUrl = registrationData.platform_join_url || eventData.join_url || '';

  // Build description
  let description = eventData.description || '';
  if (joinUrl) {
    description += description ? '\n\n' : '';
    description += `Join URL: ${joinUrl}`;
  }

  // Build attendee name
  const attendeeName = [contactData.first_name, contactData.last_name]
    .filter(Boolean)
    .join(' ') || contactData.email || 'Guest';

  // Build calendar event
  const calendarEvent: CalendarEvent = {
    title: eventData.title,
    description,
    location: joinUrl,
    startTime: eventData.scheduled_at,
    durationMinutes: eventData.duration_minutes,
    timezone: eventData.timezone,
    organizerName: 'Ceremonia',
    organizerEmail: process.env.RESEND_FROM_EMAIL || 'events@ceremonia.com',
    attendeeName,
    attendeeEmail: contactData.email || undefined,
  };

  return generateAllCalendarLinks(calendarEvent, icsContent);
}
