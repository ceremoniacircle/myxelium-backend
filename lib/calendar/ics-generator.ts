/**
 * ICS Calendar File Generator
 *
 * Generate RFC 5545 compliant .ics calendar files for event registration.
 * Supports timezones, reminders, and attendee information.
 */

import {
  formatDateForICS,
  escapeICSText,
  generateUID,
  formatDuration,
  getDateInTimezone,
  foldLine,
} from './helpers';
import type {
  CalendarEvent,
  ICSOptions,
  EventData,
  RegistrationData,
  ContactData,
} from './types';

/**
 * Generate ICS calendar file content from calendar event data
 *
 * @param event - Calendar event data
 * @param options - ICS generation options
 * @returns ICS file content as string
 *
 * @example
 * ```typescript
 * const icsContent = generateICS({
 *   title: 'AI Workshop',
 *   description: 'Learn about AI',
 *   location: 'https://zoom.us/j/123456789',
 *   startTime: '2025-10-01T14:00:00Z',
 *   durationMinutes: 60,
 *   timezone: 'America/Denver',
 *   organizerEmail: 'events@ceremonia.com',
 *   attendeeEmail: 'john@example.com'
 * });
 * ```
 */
export function generateICS(
  event: CalendarEvent,
  options: ICSOptions = {}
): string {
  const {
    prodId = '-//Ceremonia//Myxelium//EN',
    includeReminders = true,
    reminderHours = [24, 1],
    status = 'CONFIRMED',
    sequence = 0,
  } = options;

  // Parse start time
  const startDate = new Date(event.startTime);

  // Calculate end time
  const endDate = new Date(startDate.getTime() + event.durationMinutes * 60000);

  // Generate timestamp (now in UTC)
  const dtstamp = formatDateForICS(new Date(), true);

  // Format start and end times with timezone
  const dtstart = formatDateForICS(getDateInTimezone(startDate, event.timezone), false);
  const dtend = formatDateForICS(getDateInTimezone(endDate, event.timezone), false);

  // Build ICS content
  const lines: string[] = [];

  // Calendar header
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push(`PRODID:${prodId}`);
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');

  // Event
  lines.push('BEGIN:VEVENT');

  // Generate UID from event data (use a combination of fields for uniqueness)
  const uid = event.attendeeEmail
    ? `${event.attendeeEmail}-${startDate.getTime()}@ceremonia.com`
    : `event-${startDate.getTime()}@ceremonia.com`;
  lines.push(foldLine(`UID:${uid}`));

  // Timestamp
  lines.push(`DTSTAMP:${dtstamp}`);

  // Start and end times with timezone
  lines.push(`DTSTART;TZID=${event.timezone}:${dtstart}`);
  lines.push(`DTEND;TZID=${event.timezone}:${dtend}`);

  // Summary (title)
  lines.push(foldLine(`SUMMARY:${escapeICSText(event.title)}`));

  // Description
  if (event.description) {
    lines.push(foldLine(`DESCRIPTION:${escapeICSText(event.description)}`));
  }

  // Location
  if (event.location) {
    lines.push(foldLine(`LOCATION:${escapeICSText(event.location)}`));
  }

  // Organizer
  if (event.organizerEmail) {
    const organizerName = event.organizerName || 'Ceremonia';
    lines.push(foldLine(`ORGANIZER;CN=${escapeICSText(organizerName)}:mailto:${event.organizerEmail}`));
  }

  // Attendee
  if (event.attendeeEmail) {
    const attendeeName = event.attendeeName || event.attendeeEmail;
    lines.push(foldLine(`ATTENDEE;CN=${escapeICSText(attendeeName)};RSVP=TRUE:mailto:${event.attendeeEmail}`));
  }

  // Status
  lines.push(`STATUS:${status}`);

  // Sequence
  lines.push(`SEQUENCE:${sequence}`);

  // Reminders (VALARMs)
  if (includeReminders && reminderHours.length > 0) {
    reminderHours.forEach((hours, index) => {
      const minutes = hours * 60;
      const trigger = formatDuration(minutes);
      const description = hours >= 24
        ? `Reminder: Event ${hours === 24 ? 'tomorrow' : `in ${hours / 24} days`}`
        : `Reminder: Event in ${hours} hour${hours !== 1 ? 's' : ''}`;

      lines.push('BEGIN:VALARM');
      lines.push(`TRIGGER:${trigger}`);
      lines.push('ACTION:DISPLAY');
      lines.push(foldLine(`DESCRIPTION:${escapeICSText(description)}`));
      lines.push('END:VALARM');
    });
  }

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  // Join with CRLF as per RFC 5545
  return lines.join('\r\n');
}

/**
 * Generate ICS calendar file from event and registration data
 * Convenience function that builds CalendarEvent from database records
 *
 * @param eventData - Event data from database
 * @param registrationData - Registration data from database
 * @param contactData - Contact data from database
 * @param options - ICS generation options
 * @returns ICS file content as string
 *
 * @example
 * ```typescript
 * const icsContent = generateICSFromRegistration(
 *   {
 *     id: 'evt-123',
 *     title: 'AI Workshop',
 *     description: 'Learn about AI',
 *     scheduled_at: '2025-10-01T14:00:00Z',
 *     timezone: 'America/Denver',
 *     duration_minutes: 60,
 *     join_url: 'https://zoom.us/j/123456789'
 *   },
 *   {
 *     id: 'reg-123',
 *     platform_join_url: 'https://zoom.us/j/987654321'
 *   },
 *   {
 *     first_name: 'John',
 *     last_name: 'Doe',
 *     email: 'john@example.com'
 *   }
 * );
 * ```
 */
export function generateICSFromRegistration(
  eventData: EventData,
  registrationData: RegistrationData,
  contactData: ContactData,
  options: ICSOptions = {}
): string {
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
    .join(' ') || contactData.email || undefined;

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

  return generateICS(calendarEvent, options);
}

/**
 * Convert ICS content to base64 for email attachments
 *
 * @param icsContent - ICS file content as string
 * @returns Base64 encoded ICS content
 *
 * @example
 * ```typescript
 * const icsContent = generateICS(event);
 * const base64Content = icsToBase64(icsContent);
 * // Use with Resend: attachments: [{ filename: 'event.ics', content: base64Content }]
 * ```
 */
export function icsToBase64(icsContent: string): string {
  return Buffer.from(icsContent, 'utf-8').toString('base64');
}

/**
 * Generate filename for ICS attachment
 *
 * @param eventTitle - Event title
 * @returns Sanitized filename
 *
 * @example
 * ```typescript
 * generateICSFilename('AI Workshop 2025');
 * // Returns: "ai-workshop-2025.ics"
 * ```
 */
export function generateICSFilename(eventTitle: string): string {
  const sanitized = eventTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);

  return `${sanitized || 'event'}.ics`;
}
