# Zoom Integration

This module provides integration with Zoom Meetings and Zoom Webinars for the Myxelium event enrollment system.

## Features

- ✅ **Zoom Meetings** (Zoom Pro - Current)
- ✅ **Zoom Webinars** (Requires Webinar add-on - Future)
- ✅ Server-to-Server OAuth authentication
- ✅ Automatic meeting/webinar creation
- ✅ User registration with unique join URLs
- ✅ Token caching and automatic refresh

## Architecture

```
client.ts         - Low-level Zoom API client (OAuth + HTTP)
registration.ts   - High-level registration service (integrates with DB)
README.md         - This file
```

## Setup

### 1. Environment Variables

Add to `.env.local`:

```bash
ZOOM_ACCOUNT_ID="your-account-id"
ZOOM_CLIENT_ID="your-client-id"
ZOOM_CLIENT_SECRET="your-client-secret"
ZOOM_WEBHOOK_SECRET_TOKEN="your-webhook-secret"
```

### 2. Zoom App Configuration

In your Zoom Marketplace app (Server-to-Server OAuth):

**Required Scopes:**
- `meeting:write:admin` - Create meetings
- `meeting:read:admin` - Read meeting details
- `meeting:write:meeting_registrant:admin` - Register users for meetings
- `meeting:read:meeting_registrant:admin` - Read meeting registrants

**For Webinars (when add-on is enabled):**
- `webinar:write:admin`
- `webinar:read:admin`
- `webinar:write:webinar_registrant:admin`
- `webinar:read:webinar_registrant:admin`

## Usage

### Via Enrollment API (Recommended)

The enrollment API automatically handles Zoom registration:

```typescript
POST /api/enrollments
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "eventId": "event-uuid",
  "consent": {
    "email": true,
    "sms": true
  }
}

// Response includes joinUrl
{
  "success": true,
  "data": {
    "registrationId": "...",
    "contactId": "...",
    "eventId": "...",
    "joinUrl": "https://zoom.us/j/123456789?pwd=..." // ← Unique join URL
  }
}
```

### Direct API Usage

```typescript
import { zoomClient } from '@/lib/zoom/client';

// Create a meeting
const meeting = await zoomClient.createMeeting({
  topic: 'My Meeting',
  startTime: new Date('2025-10-15T10:00:00Z').toISOString(),
  duration: 60,
  timezone: 'America/Los_Angeles'
});

// Register a user
const registration = await zoomClient.addMeetingRegistrant(meeting.id, {
  email: 'user@example.com',
  first_name: 'John',
  last_name: 'Doe'
});

console.log('Join URL:', registration.join_url);
```

### With Database Integration

```typescript
import { registerContactForZoomEvent } from '@/lib/zoom/registration';

const result = await registerContactForZoomEvent(
  contact,  // Contact object from database
  event,    // Event object from database
  formData  // Optional custom form fields
);

// Updates database automatically with:
// - platform_registrant_id
// - platform_join_url
// - platform_metadata
```

## Platform Support

### Zoom Meetings (Current)

```sql
-- In events table
platform = 'zoom_meeting'
```

**Capabilities:**
- Up to 100 participants (Zoom Pro)
- Registration required
- Unique join URLs per participant
- Attendance tracking via webhooks

**Limitations:**
- No automatic recording
- No Q&A panel
- No polls (native)
- No registration questions (use custom_questions)

### Zoom Webinars (Future)

```sql
-- In events table
platform = 'zoom_webinar'
```

**Requires:** Webinar add-on ($40-79/month)

**Additional Features:**
- Up to 10,000 participants
- Panelist vs attendee roles
- Q&A panel
- Polls
- Practice session
- Registration questions
- Automatic recording

## Database Schema

The system uses a generic `events` table that supports both:

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,  -- 'zoom_meeting' or 'zoom_webinar'
  platform_event_id TEXT,  -- Zoom meeting/webinar ID
  platform_url TEXT,       -- Registration URL
  platform_metadata JSONB, -- Platform-specific data
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  ...
);

CREATE TABLE registrations (
  id UUID PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id),
  event_id UUID REFERENCES events(id),
  platform_registrant_id TEXT,  -- Zoom registrant ID
  platform_join_url TEXT,       -- Unique join URL
  platform_metadata JSONB,      -- Zoom registration response
  ...
);
```

## Testing

### Test Zoom API Connection

```bash
npx tsx scripts/test-zoom-integration.ts
```

This will:
1. Authenticate with Zoom
2. Create a test meeting
3. Register a test user
4. Return a unique join URL

### Create Test Event in Database

```bash
npx tsx scripts/create-test-event.ts
```

This creates an event you can use for testing the enrollment API.

### Test Full Enrollment Flow

```bash
# 1. Create test event
npx tsx scripts/create-test-event.ts

# 2. Start dev server
npm run dev

# 3. Test enrollment (use event ID from step 1)
curl -X POST http://localhost:3000/api/enrollments \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "eventId": "YOUR_EVENT_ID",
    "consent": { "email": true, "sms": true }
  }'
```

## Error Handling

The integration gracefully handles Zoom API failures:

```typescript
// If Zoom registration fails, enrollment still succeeds
// Error is logged in platform_metadata

{
  "platform_metadata": {
    "zoom_error": "Rate limit exceeded",
    "zoom_error_time": "2025-09-30T10:00:00Z"
  }
}
```

This ensures users are registered in your database even if Zoom is temporarily unavailable.

## Webhooks (Future)

When webhooks are enabled, you'll receive:

**Meeting Events:**
- `meeting.participant_joined` → Update attendance
- `meeting.participant_left` → Calculate duration
- `meeting.ended` → Trigger post-event campaigns

**Webinar Events:**
- `webinar.participant_joined`
- `webinar.participant_left`
- `webinar.ended`

See `/api/webhooks/zoom` (coming soon).

## Troubleshooting

### "OAuth failed: 401"
- Check credentials in `.env.local`
- Verify app is activated in Zoom Marketplace
- Ensure scopes are added

### "Rate limit exceeded"
- Zoom has rate limits (varies by plan)
- Implement exponential backoff
- Consider job queue for bulk operations

### "Webinar API not available"
- Ensure webinar add-on is enabled in Zoom account
- Update scopes to include webinar permissions

### "Invalid meeting ID"
- Meeting may have been deleted
- Check `platform_event_id` in database
- Recreate meeting if needed

## Migration Guide: Meetings → Webinars

When you enable the Webinar add-on:

1. **No code changes needed** - same API
2. **Update event platform:**
   ```sql
   UPDATE events SET platform = 'zoom_webinar' WHERE id = '...';
   ```
3. **Create new registrations** - old meetings stay as meetings

The system will automatically use the correct API based on `events.platform`.
