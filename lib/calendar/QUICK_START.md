# Calendar Integration - Quick Start Guide

## 5-Minute Integration Guide

### Step 1: Import the Calendar Module

```typescript
import {
  generateICSFromRegistration,
  icsToBase64,
  generateICSFilename,
  generateAllCalendarLinks,
} from '@/lib/calendar';
```

### Step 2: Generate ICS File

```typescript
// From database records
const icsContent = generateICSFromRegistration(
  eventData,        // Event record from database
  registrationData, // Registration record
  contactData       // Contact record
);
```

### Step 3: Attach to Email (Resend)

```typescript
// Convert to base64
const icsBase64 = icsToBase64(icsContent);
const filename = generateICSFilename(eventData.title);

// Send with Resend
await resend.emails.send({
  from: 'events@ceremonia.com',
  to: contact.email,
  subject: 'Event Confirmation',
  html: emailHtml,
  attachments: [
    {
      filename: filename,  // e.g., "ai-workshop-2025.ics"
      content: icsBase64,  // base64 encoded ICS content
    }
  ]
});
```

### Step 4: Add Calendar Links to Email

```typescript
// Generate links for all providers
const links = generateAllCalendarLinks(calendarEvent, icsContent);

// Use in HTML email
const calendarLinksHtml = `
  <div style="margin: 20px 0; padding: 15px; background: #f5f5f5;">
    <p><strong>Add to Calendar:</strong></p>
    <p>
      <a href="${links.google}">Google Calendar</a> |
      <a href="${links.outlook}">Outlook</a> |
      <a href="${links.apple}" download="${filename}">Apple Calendar</a> |
      <a href="${links.yahoo}">Yahoo Calendar</a>
    </p>
  </div>
`;
```

## Common Use Cases

### Use Case 1: Welcome Email with Calendar

```typescript
// Already implemented in inngest/functions/send-message.ts
// Automatically attaches calendar file to welcome emails
```

### Use Case 2: Custom ICS Generation

```typescript
import { generateICS } from '@/lib/calendar';

const icsContent = generateICS({
  title: 'My Event',
  description: 'Event description',
  location: 'https://zoom.us/j/123',
  startTime: '2025-10-01T14:00:00Z',
  durationMinutes: 60,
  timezone: 'America/Denver',
  organizerEmail: 'events@ceremonia.com',
  attendeeEmail: 'user@example.com',
});
```

### Use Case 3: Custom Reminders

```typescript
const icsContent = generateICS(event, {
  reminderHours: [48, 24, 1],  // 2 days, 1 day, 1 hour before
});
```

### Use Case 4: No Reminders

```typescript
const icsContent = generateICS(event, {
  includeReminders: false,
});
```

## Database Schema Requirements

The calendar module expects these fields from your database:

### Event Record

```typescript
{
  id: string;
  title: string;
  description?: string | null;
  scheduled_at: string;  // ISO 8601
  timezone: string;      // IANA timezone
  duration_minutes: number;
  join_url?: string | null;
}
```

### Registration Record

```typescript
{
  id: string;
  platform_join_url?: string | null;
}
```

### Contact Record

```typescript
{
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}
```

## Timezone Examples

```typescript
// Common IANA timezones
'America/New_York'     // Eastern Time
'America/Chicago'      // Central Time
'America/Denver'       // Mountain Time
'America/Los_Angeles'  // Pacific Time
'America/Phoenix'      // Arizona (no DST)
'Europe/London'        // GMT/BST
'Europe/Paris'         // CET/CEST
'Asia/Tokyo'           // JST
'Australia/Sydney'     // AEST/AEDT
```

## Testing Your Integration

```typescript
import { describe, it, expect } from 'vitest';
import { generateICS } from '@/lib/calendar';

describe('My Calendar Integration', () => {
  it('should generate valid ICS file', () => {
    const icsContent = generateICS({
      title: 'Test Event',
      startTime: '2025-10-01T14:00:00Z',
      durationMinutes: 60,
      timezone: 'America/Denver',
    });

    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('SUMMARY:Test Event');
    expect(icsContent).toContain('END:VCALENDAR');
  });
});
```

## Error Handling

```typescript
try {
  const icsContent = generateICSFromRegistration(
    eventData,
    registrationData,
    contactData
  );

  // Send email with attachment
  await sendEmailWithCalendar(icsContent);
} catch (error) {
  // Calendar generation failed, but email can still be sent
  console.error('Calendar generation error:', error);

  // Send email without calendar attachment
  await sendEmailWithoutCalendar();
}
```

## Debugging

### Check Generated ICS Content

```typescript
const icsContent = generateICS(event);
console.log(icsContent);
```

### Validate ICS File

1. Save to a `.ics` file
2. Open in your calendar application
3. Verify all details are correct

### Check Calendar Links

```typescript
const links = generateAllCalendarLinks(event, icsContent);
console.log('Google:', links.google);
console.log('Outlook:', links.outlook);
console.log('Yahoo:', links.yahoo);
```

## Performance Tips

1. **Cache ICS Content**: Generate once per event, reuse for multiple recipients
2. **Batch Processing**: Generate calendar files in bulk for better performance
3. **Lazy Loading**: Only generate when needed (e.g., welcome emails only)

## Common Issues

### Issue: Calendar file not importing

**Solution**: Check timezone format (must be IANA timezone identifier)

```typescript
// ✅ Correct
timezone: 'America/Denver'

// ❌ Incorrect
timezone: 'MST'
timezone: 'GMT-7'
```

### Issue: Special characters appearing incorrectly

**Solution**: Text escaping is automatic, but verify input encoding

```typescript
const event = {
  title: 'Workshop: Part 1, Section A; Details',
  // Will be automatically escaped in ICS file
};
```

### Issue: Wrong time in calendar

**Solution**: Ensure startTime is in ISO 8601 format with timezone

```typescript
// ✅ Correct
startTime: '2025-10-01T14:00:00Z'  // UTC
startTime: '2025-10-01T14:00:00-06:00'  // With offset

// ❌ Incorrect
startTime: '2025-10-01 14:00:00'
startTime: '10/01/2025 2:00 PM'
```

## API Quick Reference

| Function | Purpose | Returns |
|----------|---------|---------|
| `generateICS()` | Generate ICS file | `string` |
| `generateICSFromRegistration()` | Generate from DB records | `string` |
| `icsToBase64()` | Convert to base64 | `string` |
| `generateICSFilename()` | Generate filename | `string` |
| `generateGoogleCalendarLink()` | Google Calendar URL | `string` |
| `generateOutlookLink()` | Outlook Web URL | `string` |
| `generateYahooCalendarLink()` | Yahoo Calendar URL | `string` |
| `generateAppleCalendarLink()` | Apple Calendar URL | `string` |
| `generateAllCalendarLinks()` | All provider links | `CalendarLinks` |

## Next Steps

1. Read the full documentation: [`lib/calendar/README.md`](/Users/austinmao/Documents/GitHub/ceremonia-v2/myxelium-backend/lib/calendar/README.md)
2. Review the implementation: [`inngest/functions/send-message.ts`](/Users/austinmao/Documents/GitHub/ceremonia-v2/myxelium-backend/inngest/functions/send-message.ts)
3. Check the tests: [`tests/lib/calendar/`](/Users/austinmao/Documents/GitHub/ceremonia-v2/myxelium-backend/tests/lib/calendar/)
4. See the summary: [`CALENDAR_INTEGRATION_SUMMARY.md`](/Users/austinmao/Documents/GitHub/ceremonia-v2/myxelium-backend/CALENDAR_INTEGRATION_SUMMARY.md)

## Support

- For bugs: Check test cases in `tests/lib/calendar/`
- For questions: See full API reference in `lib/calendar/README.md`
- For examples: Check `inngest/functions/send-message.ts` implementation

---

**Quick Start Complete!** You're ready to use the calendar integration in your application.
