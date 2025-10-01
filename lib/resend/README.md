# Resend Email Integration

This directory contains the Resend email provider integration for the Myxelium event funnel orchestration system.

## Overview

Resend is used as the primary email delivery provider, integrated with the Inngest job queue for reliable, trackable email sending across pre-event and post-event campaigns.

## Files

- **`client.ts`** - Resend client configuration and initialization
- **`types.ts`** - TypeScript type definitions for Resend email operations
- **`helpers.ts`** - Utility functions for template personalization and formatting
- **`README.md`** - This documentation file

## Setup Instructions

### 1. Get Resend API Key

1. Sign up at [https://resend.com](https://resend.com)
2. Navigate to [API Keys](https://resend.com/api-keys)
3. Create a new API key
4. Copy the key (starts with `re_`)

### 2. Verify Your Domain

1. Go to [Domains](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your domain (e.g., `ceremonia.com`)
4. Add the DNS records shown to your domain provider
5. Wait for verification (usually < 5 minutes)

### 3. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Resend Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_WEBHOOK_SECRET=whsec_your_webhook_secret_here
RESEND_FROM_EMAIL=noreply@ceremonia.com
RESEND_FROM_NAME=Ceremonia
```

### 4. Set Up Webhooks

1. Go to [Webhooks](https://resend.com/webhooks)
2. Click "Add Webhook"
3. Enter your webhook URL:
   - Development: `https://your-ngrok-url.ngrok.io/api/webhooks/resend`
   - Production: `https://yourdomain.com/api/webhooks/resend`
4. Select events to receive:
   - ✅ `email.sent`
   - ✅ `email.delivered`
   - ✅ `email.delivery_delayed`
   - ✅ `email.bounced`
   - ✅ `email.complained`
   - ✅ `email.opened`
   - ✅ `email.clicked`
5. Copy the signing secret and add it to `RESEND_WEBHOOK_SECRET`

## Usage

### Sending Emails

Emails are sent automatically through the Inngest `send-message` function. The system handles:

- ✅ Template personalization with {{token}} replacement
- ✅ HTML and plain text generation
- ✅ Consent checking before sending
- ✅ Rate limiting (100 emails/minute)
- ✅ Retry logic with exponential backoff
- ✅ Error handling for invalid recipients
- ✅ Delivery tracking via webhooks

### Template Tokens

Available tokens for personalization:

- `{{firstName}}` - Contact's first name
- `{{lastName}}` - Contact's last name
- `{{email}}` - Contact's email address
- `{{eventTitle}}` - Event title
- `{{eventDate}}` - Formatted event date (e.g., "Monday, October 1, 2025 at 10:00 AM PDT")
- `{{joinUrl}}` - Platform join URL (Zoom, etc.)

### Example Email Templates

**Welcome Email:**
```
Subject: You're registered for {{eventTitle}}!

Hi {{firstName}},

You're all set for "{{eventTitle}}"!

Event Date: {{eventDate}}
Join URL: {{joinUrl}}

See you there!

Best,
The Ceremonia Team
```

**24-Hour Reminder:**
```
Subject: Tomorrow: {{eventTitle}}

Hi {{firstName}},

Reminder: "{{eventTitle}}" is happening tomorrow!

Event Date: {{eventDate}}
Join URL: {{joinUrl}}

See you soon!

Best,
The Ceremonia Team
```

## Rate Limits

Resend rate limits:

- **Free Tier:** 100 emails/day, 3,000 emails/month
- **Paid Tier:** 10,000+ emails/day (varies by plan)
- **API Rate Limit:** 100 requests/minute

The system respects these limits through:
- Inngest rate limiting configuration (100 messages/minute)
- Exponential backoff on 429 errors
- Automatic retry for transient failures

## Error Handling

### Rate Limiting (429)
- **Action:** Throw retriable error
- **Inngest Behavior:** Retry with exponential backoff
- **Retry Schedule:** 1min → 5min → 30min → 2hr

### Invalid Recipient
- **Action:** Throw non-retriable error
- **Inngest Behavior:** Mark as failed, no retry
- **Database Status:** `bounced` or `failed`

### Temporary Failures (5xx)
- **Action:** Throw retriable error
- **Inngest Behavior:** Retry up to 4 times
- **Database Status:** `failed` after max retries

### API Key Missing
- **Action:** Throw non-retriable error
- **Inngest Behavior:** Fail immediately
- **Log:** Warning about missing configuration

## Webhook Events

The webhook handler at `/api/webhooks/resend` processes these events:

| Event | Database Update | Activity Created |
|-------|----------------|-----------------|
| `email.sent` | `status = 'sent'`, `sent_at = timestamp` | No |
| `email.delivered` | `status = 'delivered'`, `delivered_at = timestamp` | No |
| `email.opened` | `status = 'opened'`, `opened_at = timestamp`, `open_count++` | Yes |
| `email.clicked` | `status = 'clicked'`, `first_clicked_at = timestamp`, `click_count++`, track link | Yes |
| `email.bounced` | `status = 'bounced'`, `bounced_at = timestamp`, `error_message` | Yes |
| `email.complained` | `status = 'spam'`, `spam_reported_at = timestamp` | Yes |
| `email.delivery_delayed` | Log warning (no status change) | No |

## Database Schema

### `sent_messages` Table

Key columns used for email tracking:

```sql
-- Message identification
id UUID PRIMARY KEY
contact_id UUID REFERENCES contacts(id)
registration_id UUID REFERENCES registrations(id)
campaign_id UUID REFERENCES campaigns(id)
template_id UUID REFERENCES message_templates(id)

-- Provider tracking
channel TEXT (= 'email')
provider TEXT (= 'resend')
provider_message_id TEXT -- Resend email ID

-- Content (snapshot)
subject TEXT
body_html TEXT
body_text TEXT
recipient_email TEXT

-- Delivery tracking
status TEXT -- queued | sent | delivered | opened | clicked | bounced | failed | spam
sent_at TIMESTAMPTZ
delivered_at TIMESTAMPTZ
opened_at TIMESTAMPTZ
first_clicked_at TIMESTAMPTZ
bounced_at TIMESTAMPTZ
spam_reported_at TIMESTAMPTZ

-- Engagement metrics
open_count INTEGER DEFAULT 0
click_count INTEGER DEFAULT 0
unique_clicks INTEGER DEFAULT 0
links_clicked JSONB -- Array of {url, clicked_at, click_count}

-- Error tracking
error_code TEXT
error_message TEXT
bounce_type TEXT -- hard | soft | technical
```

## Testing

### Unit Tests

Run the test suite:

```bash
npm test tests/inngest/functions/send-message.test.ts
```

Tests cover:
- Template personalization
- Resend client integration
- Error handling
- Webhook event processing

### Manual Testing

1. **Test Email Sending:**
```bash
curl -X POST http://localhost:3000/api/enrollments \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "eventId": "your-event-uuid",
    "smsConsent": false
  }'
```

2. **Check Inngest Dashboard:**
   - Go to [https://app.inngest.com](https://app.inngest.com)
   - Navigate to "Functions" → "send-message"
   - Verify the function executed successfully

3. **Check Email Inbox:**
   - Verify you received the welcome email
   - Check subject and content personalization

4. **Check Database:**
```sql
SELECT
  id,
  status,
  provider_message_id,
  sent_at,
  delivered_at,
  open_count
FROM sent_messages
WHERE recipient_email = 'your-email@example.com'
ORDER BY created_at DESC;
```

5. **Test Webhooks:**
   - Open the email
   - Click a link
   - Check database for updated `opened_at` and `click_count`

## Monitoring

### Key Metrics to Track

1. **Send Rate:** Messages sent per minute
2. **Delivery Rate:** (delivered / sent) * 100
3. **Open Rate:** (opened / delivered) * 100
4. **Click Rate:** (clicked / opened) * 100
5. **Bounce Rate:** (bounced / sent) * 100
6. **Error Rate:** (failed / total) * 100

### Queries for Monitoring

**Daily Email Stats:**
```sql
SELECT
  DATE(sent_at) as date,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
  COUNT(CASE WHEN status = 'opened' THEN 1 END) as opened,
  COUNT(CASE WHEN status = 'clicked' THEN 1 END) as clicked,
  COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounced,
  ROUND(100.0 * COUNT(CASE WHEN status = 'opened' THEN 1 END) / NULLIF(COUNT(CASE WHEN status = 'delivered' THEN 1 END), 0), 2) as open_rate
FROM sent_messages
WHERE channel = 'email' AND provider = 'resend'
GROUP BY DATE(sent_at)
ORDER BY date DESC;
```

## Troubleshooting

### Emails Not Sending

1. **Check API Key:**
   ```bash
   echo $RESEND_API_KEY
   ```
   Should start with `re_`

2. **Check Domain Verification:**
   - Log in to Resend dashboard
   - Go to Domains
   - Ensure status is "Verified"

3. **Check Logs:**
   ```bash
   # Check Inngest function logs
   # Look for [send-message] entries
   ```

4. **Check Database:**
   ```sql
   SELECT status, error_message
   FROM sent_messages
   WHERE status = 'failed'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

### Webhooks Not Working

1. **Verify Webhook URL is publicly accessible**
2. **Check webhook secret in .env.local**
3. **Review webhook logs in Resend dashboard**
4. **Check database:**
   ```sql
   SELECT event_type, processed, processing_error
   FROM webhook_events
   WHERE provider = 'resend'
   ORDER BY received_at DESC
   LIMIT 10;
   ```

### Rate Limiting Issues

1. **Check your Resend plan limits**
2. **Monitor send rate:**
   ```sql
   SELECT
     DATE_TRUNC('minute', sent_at) as minute,
     COUNT(*) as emails_sent
   FROM sent_messages
   WHERE channel = 'email' AND provider = 'resend'
     AND sent_at > NOW() - INTERVAL '1 hour'
   GROUP BY DATE_TRUNC('minute', sent_at)
   ORDER BY minute DESC;
   ```
3. **Adjust Inngest rate limit in `send-message.ts` if needed**

## Best Practices

1. **Always test with real email addresses** (avoid temporary/disposable emails)
2. **Monitor bounce rates** - high rates can hurt deliverability
3. **Implement proper unsubscribe handling** - respect recipient preferences
4. **Use meaningful subject lines** - avoid spam trigger words
5. **Personalize content** - use all available tokens
6. **Track engagement** - use webhook data to improve campaigns
7. **Keep HTML simple** - avoid complex styles that break in email clients
8. **Always include plain text version** - for accessibility and deliverability

## Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Resend Node.js SDK](https://github.com/resendlabs/resend-node)
- [Email Best Practices](https://resend.com/docs/knowledge-base/best-practices)
- [Inngest Documentation](https://www.inngest.com/docs)
