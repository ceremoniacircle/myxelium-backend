# Calendar Integration Module

RFC 5545 compliant calendar file generation and add-to-calendar link creation for the Myxelium event funnel orchestration API.

## Features

- **ICS File Generation**: Generate RFC 5545 compliant `.ics` calendar files
- **Multi-Provider Support**: Google Calendar, Outlook, Apple Calendar, Yahoo Calendar
- **Timezone Handling**: Proper IANA timezone support with correct date/time formatting
- **Event Reminders**: Configurable reminder notifications (24h and 1h by default)
- **Email Integration**: Automatic attachment to welcome emails via Resend
- **Add-to-Calendar Links**: HTML links for all major calendar providers

## Usage

### Basic ICS Generation

```typescript
import { generateICS } from '@/lib/calendar';

const icsContent = generateICS({
  title: 'AI Workshop 2025',
  description: 'Learn about artificial intelligence',
  location: 'https://zoom.us/j/123456789',
  startTime: '2025-10-01T14:00:00Z',
  durationMinutes: 60,
  timezone: 'America/Denver',
  organizerEmail: 'events@ceremonia.com',
  attendeeEmail: 'john@example.com'
});
```

### Generate from Database Records

```typescript
import { generateICSFromRegistration } from '@/lib/calendar';

const icsContent = generateICSFromRegistration(
  eventData,      // Event from database
  registrationData, // Registration from database
  contactData      // Contact from database
);
```

### Create Add-to-Calendar Links

```typescript
import { generateAllCalendarLinks } from '@/lib/calendar';

const links = generateAllCalendarLinks(calendarEvent, icsContent);

console.log(links.google);  // Google Calendar URL
console.log(links.outlook); // Outlook Web URL
console.log(links.apple);   // Apple Calendar data URL
console.log(links.yahoo);   // Yahoo Calendar URL
```

### Email Attachment

```typescript
import { icsToBase64, generateICSFilename } from '@/lib/calendar';

const icsBase64 = icsToBase64(icsContent);
const filename = generateICSFilename('AI Workshop 2025'); // "ai-workshop-2025.ics"

// Use with Resend
await resend.emails.send({
  from: 'events@ceremonia.com',
  to: 'attendee@example.com',
  subject: 'Event Registration Confirmed',
  html: emailHtml,
  attachments: [
    {
      filename: filename,
      content: icsBase64,
    }
  ]
});
```

## Module Structure

```
lib/calendar/
├── types.ts           # TypeScript type definitions
├── helpers.ts         # Utility functions (date formatting, text escaping, etc.)
├── ics-generator.ts   # ICS file generation
├── links.ts           # Add-to-calendar link generation
├── index.ts           # Module exports
└── README.md          # This file
```

## API Reference

### ICS Generation

#### `generateICS(event, options?)`

Generate RFC 5545 compliant ICS file content.

**Parameters:**
- `event: CalendarEvent` - Event data
- `options?: ICSOptions` - Generation options
  - `prodId?: string` - Product identifier (default: `-//Ceremonia//Myxelium//EN`)
  - `includeReminders?: boolean` - Include reminders (default: `true`)
  - `reminderHours?: number[]` - Reminder times in hours (default: `[24, 1]`)
  - `status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED'` - Event status (default: `'CONFIRMED'`)
  - `sequence?: number` - Sequence number for updates (default: `0`)

**Returns:** `string` - ICS file content

#### `generateICSFromRegistration(eventData, registrationData, contactData, options?)`

Generate ICS file from database records.

**Parameters:**
- `eventData: EventData` - Event from database
- `registrationData: RegistrationData` - Registration from database
- `contactData: ContactData` - Contact from database
- `options?: ICSOptions` - Generation options

**Returns:** `string` - ICS file content

#### `icsToBase64(icsContent)`

Convert ICS content to base64 for email attachments.

**Parameters:**
- `icsContent: string` - ICS file content

**Returns:** `string` - Base64 encoded content

#### `generateICSFilename(eventTitle)`

Generate sanitized filename for ICS file.

**Parameters:**
- `eventTitle: string` - Event title

**Returns:** `string` - Filename (e.g., `"ai-workshop-2025.ics"`)

### Calendar Links

#### `generateGoogleCalendarLink(event)`

Generate Google Calendar "Add Event" link.

**Parameters:**
- `event: CalendarEvent` - Event data

**Returns:** `string` - Google Calendar URL

#### `generateOutlookLink(event)`

Generate Outlook Web "Add Event" link.

**Parameters:**
- `event: CalendarEvent` - Event data

**Returns:** `string` - Outlook Web URL

#### `generateYahooCalendarLink(event)`

Generate Yahoo Calendar "Add Event" link.

**Parameters:**
- `event: CalendarEvent` - Event data

**Returns:** `string` - Yahoo Calendar URL

#### `generateAppleCalendarLink(icsContent)`

Generate Apple Calendar data URL.

**Parameters:**
- `icsContent: string` - ICS file content

**Returns:** `string` - Data URL for .ics file

#### `generateAllCalendarLinks(event, icsContent)`

Generate links for all calendar providers.

**Parameters:**
- `event: CalendarEvent` - Event data
- `icsContent: string` - ICS file content

**Returns:** `CalendarLinks` - Object with links for all providers

#### `generateCalendarLinksFromRegistration(eventData, registrationData, contactData, icsContent)`

Generate calendar links from database records.

**Parameters:**
- `eventData: EventData` - Event from database
- `registrationData: RegistrationData` - Registration from database
- `contactData: ContactData` - Contact from database
- `icsContent: string` - ICS file content

**Returns:** `CalendarLinks` - Object with links for all providers

### Helper Utilities

#### `formatDateForICS(date, useUtc?)`

Format Date object to ICS format.

**Parameters:**
- `date: Date` - Date to format
- `useUtc?: boolean` - Use UTC format with Z suffix (default: `false`)

**Returns:** `string` - Formatted date (e.g., `"20251001T140000Z"` or `"20251001T140000"`)

#### `escapeICSText(text)`

Escape special characters for ICS text fields per RFC 5545.

**Parameters:**
- `text: string` - Text to escape

**Returns:** `string` - Escaped text

#### `generateUID(registrationId)`

Generate unique identifier for calendar event.

**Parameters:**
- `registrationId: string` - Registration ID

**Returns:** `string` - UID (e.g., `"registration-{id}@ceremonia.com"`)

#### `formatDuration(minutes)`

Convert minutes to ISO 8601 duration format for VALARM.

**Parameters:**
- `minutes: number` - Duration in minutes

**Returns:** `string` - ISO 8601 duration (e.g., `"-PT24H"`, `"-PT1H30M"`)

#### `foldLine(text)`

Fold long lines according to RFC 5545 (max 75 octets per line).

**Parameters:**
- `text: string` - Text to fold

**Returns:** `string` - Folded text with line breaks

## Integration with Send Message Function

The calendar integration is automatically included in the welcome email template. When a welcome email is sent:

1. **ICS File Generated**: Creates RFC 5545 compliant calendar file
2. **Attached to Email**: Automatically attached to Resend email
3. **Calendar Links Added**: HTML links for Google, Outlook, Apple, Yahoo Calendar added to email body

### Email Template Enhancement

The welcome email template now includes:

```
Hi John,

You're all set for "AI Workshop 2025"!

Event: Wednesday, October 1, 2025 at 2:00 PM MDT

Join URL: https://zoom.us/j/123456789

Add this event to your calendar using the links in this email.

See you there!

Best,
The Ceremonia Team

---
Add to Calendar:
Google Calendar | Outlook | Apple Calendar | Yahoo Calendar
```

## RFC 5545 Compliance

The ICS generator follows RFC 5545 (iCalendar) specifications:

- **CRLF Line Endings**: Uses `\r\n` for all line breaks
- **Line Folding**: Long lines are folded at 75 octets with continuation
- **Character Escaping**: Properly escapes `;`, `,`, `\`, and newlines
- **Required Properties**: Includes all required VCALENDAR and VEVENT properties
- **Timezone Support**: Uses TZID parameter for proper timezone handling
- **VALARMs**: Includes reminder notifications with proper trigger times

## Timezone Handling

The calendar module uses IANA timezone identifiers (e.g., `America/Denver`, `America/New_York`) for proper timezone handling:

- **DTSTART/DTEND**: Include `TZID` parameter with timezone identifier
- **Date Formatting**: Uses `Intl.DateTimeFormat` for timezone-aware formatting
- **Cross-Platform**: Works correctly across Google Calendar, Outlook, Apple Calendar

## Testing

Comprehensive test coverage (>90%) includes:

- **Unit Tests**: All helper functions, ICS generation, link generation
- **Integration Tests**: Database record conversion, email attachment
- **Edge Cases**: Different timezones, special characters, missing data
- **RFC Compliance**: Validates against RFC 5545 requirements

Run tests:

```bash
npm test -- tests/lib/calendar
```

## Example ICS Output

```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Ceremonia//Myxelium//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:john@example.com-1759327200000@ceremonia.com
DTSTAMP:20251001T120000Z
DTSTART;TZID=America/Denver:20251001T140000
DTEND;TZID=America/Denver:20251001T150000
SUMMARY:AI Workshop 2025
DESCRIPTION:Learn about artificial intelligence\n\nJoin URL: https://zoom
 .us/j/123456789
LOCATION:https://zoom.us/j/123456789
ORGANIZER;CN=Ceremonia:mailto:events@ceremonia.com
ATTENDEE;CN=John Doe;RSVP=TRUE:mailto:john@example.com
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT24H
ACTION:DISPLAY
DESCRIPTION:Reminder: Event tomorrow
END:VALARM
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:Reminder: Event in 1 hour
END:VALARM
END:VEVENT
END:VCALENDAR
```

## Error Handling

The calendar integration includes robust error handling:

- **Non-Blocking**: Calendar generation errors don't fail email sending
- **Logging**: All errors are logged for debugging
- **Graceful Degradation**: Email sends successfully even if calendar generation fails
- **Validation**: Input validation for dates, timezones, required fields

## Future Enhancements

Potential improvements:

- [ ] Support for recurring events (RRULE)
- [ ] Multiple attendees support
- [ ] Event updates/cancellations (SEQUENCE handling)
- [ ] Custom reminder messages
- [ ] iCal VTIMEZONE component inclusion
- [ ] Support for event attachments
- [ ] Event categories and tags
- [ ] Custom event properties

## References

- [RFC 5545 - iCalendar Specification](https://tools.ietf.org/html/rfc5545)
- [IANA Time Zone Database](https://www.iana.org/time-zones)
- [Resend Attachments API](https://resend.com/docs/api-reference/emails/send-email)
- [Google Calendar Event Parameters](https://github.com/InteractionDesignFoundation/add-event-to-calendar-docs/blob/main/services/google.md)
- [Outlook Calendar Parameters](https://github.com/InteractionDesignFoundation/add-event-to-calendar-docs/blob/main/services/outlook-web.md)
