# Inngest Functions

This directory contains all Inngest serverless functions for event-driven drip campaigns and job queue management.

## Structure

```
/inngest
  /client.ts                 # Inngest client configuration
  /functions
    /event-funnel.ts         # Pre-event drip campaign
    /post-event-funnel.ts    # Post-event branching campaigns
    /send-message.ts         # Generic message sender
```

## Functions

### Pre-Event Funnel (`event-funnel.ts`)

Handles the 3-step pre-event sequence:
1. Welcome email (immediate)
2. 24-hour reminder (email + SMS)
3. 1-hour reminder (email + SMS)

**Trigger:** `event.enrolled`

**Features:**
- Time-based delays using `sleepUntil()`
- Event validation before each step
- Consent checking
- Automatic retries

### Post-Event Funnel (`post-event-funnel.ts`)

Handles branching post-event sequences:

**Path A - Attended:**
1. Thank you email (T+1h)
2. Resources email (T+24h)
3. Nurture email (T+3d)

**Path B - No-show:**
1. Sorry we missed you (T+1h)
2. Re-engagement email + SMS (T+24h)
3. Final follow-up (T+7d)

**Trigger:** `event.completed`

**Features:**
- Automatic branching based on attendance
- Parallel processing of registrations
- Sub-functions for delayed steps

### Generic Message Sender (`send-message.ts`)

Reusable function for sending messages across all channels.

**Trigger:** `message.send`

**Features:**
- Consent validation
- Template personalization
- Database tracking
- Rate limiting
- Retry policy

## Event Types

### Input Events

```typescript
// Enrollment trigger
{
  name: 'event.enrolled',
  data: {
    contactId: string;
    eventId: string;
    registrationId: string;
    eventTitle: string;
    scheduledAt: string;
    contactEmail: string;
    // ... more fields
  }
}

// Event completion trigger
{
  name: 'event.completed',
  data: {
    eventId: string;
    eventTitle: string;
    completedAt: string;
  }
}

// Direct message send
{
  name: 'message.send',
  data: {
    contactId: string;
    registrationId?: string;
    templateType: string;
    channel: 'email' | 'sms';
    stepType?: string;
  }
}
```

## Development

### Testing Locally

```bash
# Start Inngest Dev Server
npm run inngest:dev

# In another terminal, start Next.js
npm run dev

# Test functions
npm run inngest:test:pre    # Pre-event funnel
npm run inngest:test:post   # Post-event funnel
npm run inngest:test:all    # All functions
```

### Adding New Functions

1. Create function file in `/inngest/functions/`
2. Define function with `inngest.createFunction()`
3. Register in `/app/api/inngest/route.ts`
4. Test with Inngest Dev Server

Example:

```typescript
// /inngest/functions/my-function.ts
import { inngest } from '@/inngest/client';

export const myFunction = inngest.createFunction(
  {
    id: 'my-function',
    name: 'My Custom Function',
    retries: 3,
  },
  { event: 'my.event' },
  async ({ event, step }) => {
    // Function logic here
  }
);

// Register in /app/api/inngest/route.ts
import { myFunction } from '@/inngest/functions/my-function';

const functions = [
  // ... existing functions
  myFunction,
];
```

## Best Practices

1. **Idempotency** - Use unique IDs for steps
2. **Error Handling** - Wrap external calls in try/catch
3. **Logging** - Use structured console.log for debugging
4. **Retries** - Configure appropriate retry policies
5. **Rate Limits** - Set throttle/rate limits for external APIs
6. **Validation** - Check data validity before processing
7. **Time Zones** - Handle time zones correctly for delays

## Monitoring

View function execution:
- **Local**: http://localhost:8288
- **Production**: https://app.inngest.com

## Documentation

See `/docs/inngest-implementation.md` for full documentation.
