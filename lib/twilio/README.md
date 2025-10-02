# Twilio SMS Integration

This directory contains the Twilio SMS provider integration for the Myxelium event funnel orchestration API.

## Overview

The Twilio integration enables SMS delivery for event reminders and notifications with features including:

- Phone number validation (E.164 format)
- SMS template personalization
- Quiet hours enforcement (9am-9pm local time)
- Auto-response handling (STOP/START/HELP)
- Delivery status tracking via webhooks
- SMS consent management

## Files

- **`client.ts`** - Twilio client initialization and configuration
- **`helpers.ts`** - Helper functions for phone validation, SMS formatting, and quiet hours
- **`types.ts`** - TypeScript type definitions
- **`README.md`** - This documentation file

## Setup Instructions

### 1. Create Twilio Account

1. Sign up at https://www.twilio.com/try-twilio
2. Get your Account SID and Auth Token from https://console.twilio.com
3. Purchase a phone number at https://console.twilio.com/us1/develop/phone-numbers/manage/search

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=AC...                    # Your Twilio Account SID
TWILIO_AUTH_TOKEN=...                        # Your Twilio Auth Token
TWILIO_PHONE_NUMBER=+1...                    # Your Twilio phone number (E.164 format)
TWILIO_WEBHOOK_AUTH_TOKEN=...                # For webhook signature verification (optional)

# Site URL (for webhook callbacks)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### 3. Configure Webhooks

1. Log in to Twilio console: https://console.twilio.com
2. Go to **Phone Numbers > Manage > Active Numbers**
3. Click on your phone number
4. Under **Messaging**:
   - **A MESSAGE COMES IN**: Webhook - `https://yourdomain.com/api/webhooks/twilio`
   - **Configure with**: HTTP POST
5. Under **Configure**:
   - **STATUS CALLBACK URL**: `https://yourdomain.com/api/webhooks/twilio`

### 4. Test the Integration

```typescript
import { twilioClient, TWILIO_PHONE_NUMBER, isTwilioConfigured } from '@/lib/twilio/client';
import { validatePhoneNumber, normalizePhoneNumber } from '@/lib/twilio/helpers';

// Check if configured
if (isTwilioConfigured()) {
  // Send SMS
  const message = await twilioClient.messages.create({
    body: 'Hello from Twilio!',
    from: TWILIO_PHONE_NUMBER,
    to: '+14155552671',
  });

  console.log('Message sent:', message.sid);
}
```

## Phone Number Validation

The integration uses `libphonenumber-js` for phone number validation and normalization.

### E.164 Format

All phone numbers must be in E.164 format:
- Starts with `+`
- Includes country code
- No spaces, dashes, or parentheses
- Example: `+14155552671`

### Validation

```typescript
import { validatePhoneNumber, normalizePhoneNumber } from '@/lib/twilio/helpers';

// Validate phone number
const isValid = validatePhoneNumber('+14155552671'); // true

// Normalize phone number
const normalized = normalizePhoneNumber('(415) 555-2671', 'US'); // '+14155552671'
```

## SMS Template Personalization

Use `{{token}}` placeholders for dynamic content:

```typescript
import { personalizeSMSTemplate } from '@/lib/twilio/helpers';

const template = 'Hi {{firstName}}! Reminder: "{{eventTitle}}" tomorrow. Join: {{joinUrl}}';

const message = personalizeSMSTemplate(template, {
  firstName: 'John',
  eventTitle: 'AI Webinar',
  joinUrl: 'https://zoom.us/j/123',
});
// Result: "Hi John! Reminder: "AI Webinar" tomorrow. Join: https://zoom.us/j/123"
```

## Quiet Hours

SMS messages are only sent between 9am-9pm in the user's local timezone.

```typescript
import { isWithinQuietHours, getNextQuietHoursSendTime } from '@/lib/twilio/helpers';

const timezone = 'America/Los_Angeles';
const now = new Date();

// Check if within quiet hours
if (isWithinQuietHours(timezone, now)) {
  // OK to send
} else {
  // Get next available send time
  const nextSendTime = getNextQuietHoursSendTime(timezone, now);
  console.log('Delay until:', nextSendTime);
}
```

## Auto-Response Handling

The integration automatically handles standard SMS keywords:

### STOP/STOPALL/UNSUBSCRIBE/CANCEL/END/QUIT
- Revokes SMS consent
- Updates `sms_consent` to `false`
- Sends confirmation message

### START/YES/UNSTOP
- Grants SMS consent
- Updates `sms_consent` to `true`
- Sends confirmation message

### HELP/INFO
- Sends help message with instructions

```typescript
import { handleAutoResponse, isAutoResponseKeyword } from '@/lib/twilio/helpers';

const response = handleAutoResponse('STOP');
// "You have successfully been unsubscribed. You will not receive any more messages from us. Reply START to resubscribe."

const isKeyword = isAutoResponseKeyword('HELLO'); // false
```

## Webhook Events

The Twilio webhook handler processes the following status events:

### Status Events
- **queued** - Message queued for delivery
- **sent** - Message sent to carrier
- **delivered** - Message successfully delivered
- **failed** - Message failed to send
- **undelivered** - Message could not be delivered

### Incoming Messages
- Auto-response keywords (STOP/START/HELP)
- User replies

All webhook events are logged to the `webhook_events` table and update the `sent_messages` table accordingly.

## SMS Length Limits

- **Single segment**: 160 characters
- **Multi-segment**: Up to 1600 characters (split into multiple messages)

Use `truncateSMS()` to ensure messages fit within limits:

```typescript
import { truncateSMS } from '@/lib/twilio/helpers';

const message = 'Very long message...';
const truncated = truncateSMS(message, 160); // Truncates to 160 chars with '...'
```

## Error Handling

The integration handles common Twilio errors:

### Non-Retriable Errors (won't retry)
- **21211** - Invalid 'To' phone number
- **21614** - 'To' number not verified (trial account)
- **21408** - Permission to send blocked
- **21606** - Insufficient account balance

### Retriable Errors (will retry)
- **20429** - Rate limit exceeded
- Network errors
- Temporary API issues

## Rate Limits

Default rate limits:
- **100 messages per minute**
- **10 messages per second**

These limits are configurable in `client.ts`.

## Testing

Run the test suite:

```bash
npm test lib/twilio
npm test api/webhooks/twilio
```

Test coverage:
- **Client tests**: 8+ tests
- **Helper tests**: 50+ tests
- **Webhook tests**: 12+ tests

## Cost Estimates

Based on PRD requirements:
- **Twilio**: ~$4/month
- 500 SMS at $0.008 each
- Phone number rental: $1/month

## Integration with Inngest

The Twilio integration is used by the Inngest `send-message` function:

```typescript
import { inngest } from '@/inngest/client';

// Trigger SMS send
await inngest.send({
  name: 'message.send',
  data: {
    contactId: 'contact-123',
    templateType: 'reminder-24h-sms',
    channel: 'sms',
  },
});
```

## Security Considerations

1. **Webhook Signature Verification**: All webhooks are verified using Twilio's signature validation
2. **Credentials**: Never commit API keys to version control
3. **Consent**: SMS is only sent to users with `sms_consent = true`
4. **Auto-Unsubscribe**: STOP keywords immediately revoke consent

## Support

- Twilio Documentation: https://www.twilio.com/docs/sms
- Twilio Console: https://console.twilio.com
- Twilio Support: https://support.twilio.com

## License

See project root LICENSE file.
