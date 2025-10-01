# Myxelium - Event Funnel Orchestration API

Backend API for automated event enrollment and multi-channel drip campaigns.

## Overview

Myxelium is a Next.js 15 + TypeScript backend that automates:
- Event registration (Zoom Meetings/Webinars)
- Pre-event reminder campaigns (email + SMS)
- Post-event nurture sequences (branching logic)
- Multi-channel message delivery
- Engagement tracking

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (Postgres)
- **Job Queue**: Inngest
- **Event Platform**: Zoom (Meetings + Webinars)
- **Email**: Resend (coming soon)
- **SMS**: Twilio (coming soon)
- **Language**: TypeScript

## Project Status

### Completed
- ✅ Database schema with 12 tables
- ✅ Enrollment API endpoint
- ✅ Zoom integration (Meetings + Webinars)
- ✅ Inngest job queue system
- ✅ Pre-event drip campaign (3 steps)
- ✅ Post-event drip campaign (branching)
- ✅ Message tracking and logging

### In Progress
- 🚧 Resend email integration
- 🚧 Twilio SMS integration
- 🚧 Webhook handlers

### Upcoming
- ⏳ Content API integration
- ⏳ Admin endpoints
- ⏳ Analytics dashboard

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

Required variables:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `ZOOM_ACCOUNT_ID` - Zoom server-to-server app account ID
- `ZOOM_CLIENT_ID` - Zoom client ID
- `ZOOM_CLIENT_SECRET` - Zoom client secret
- `INNGEST_EVENT_KEY` - Inngest event key (auto-generated for dev)
- `INNGEST_SIGNING_KEY` - Inngest signing key (auto-generated for dev)

### 3. Run Database Migrations
```bash
# Run all migrations in supabase/migrations/ via Supabase dashboard
# Or use Supabase CLI: supabase db push
```

### 4. Start Development Servers

Terminal 1 - Inngest Dev Server:
```bash
npm run inngest:dev
```

Terminal 2 - Next.js Dev Server:
```bash
npm run dev
```

### 5. Test the System
```bash
# Test pre-event funnel
npm run inngest:test:pre

# Test post-event funnel
npm run inngest:test:post

# Test all functions
npm run inngest:test:all
```

## Project Structure

```
/app
  /api
    /enrollments      # Enrollment endpoint
    /inngest          # Inngest webhook handler

/inngest
  /client.ts          # Inngest configuration
  /functions          # Job queue functions
    /event-funnel.ts       # Pre-event campaign
    /post-event-funnel.ts  # Post-event campaigns
    /send-message.ts       # Message sender

/lib
  /db.ts             # Supabase client
  /zoom              # Zoom integration
  /inngest           # Inngest helpers
  /types             # TypeScript types

/supabase
  /migrations        # Database migrations

/scripts
  /test-inngest.ts   # Testing scripts

/docs
  /inngest-implementation.md  # Full documentation
  /inngest-quickstart.md      # Quick start guide
  /product-requirements-v1.0.0.md  # PRD
```

## API Endpoints

### POST /api/enrollments
Enroll a contact in an event.

**Request:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+15555551234",
  "eventId": "uuid",
  "consent": {
    "email": true,
    "sms": true,
    "marketing": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "registrationId": "uuid",
    "contactId": "uuid",
    "eventId": "uuid",
    "joinUrl": "https://zoom.us/j/...",
    "message": "Successfully registered for Event Title"
  }
}
```

### POST /api/inngest
Inngest webhook handler (internal use only).

## Inngest Functions

### Pre-Event Funnel
**Trigger:** `event.enrolled`

**Sequence:**
1. Welcome email (T+0)
2. 24h reminder email + SMS (T-24h)
3. 1h reminder email + SMS (T-1h)

### Post-Event Funnel
**Trigger:** `event.completed`

**Attended Path:**
1. Thank you email (T+1h)
2. Resources email (T+24h)
3. Nurture email (T+3d)

**No-show Path:**
1. Sorry we missed you (T+1h)
2. Re-engagement email + SMS (T+24h)
3. Final follow-up (T+7d)

## Development

### NPM Scripts
```bash
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run inngest:dev      # Start Inngest dev server
npm run inngest:test     # Run all Inngest tests
npm run inngest:test:pre # Test pre-event funnel
npm run inngest:test:post # Test post-event funnel
```

### Testing Locally

1. Start Inngest Dev Server: `npm run inngest:dev`
2. Start Next.js: `npm run dev`
3. View Inngest Dashboard: http://localhost:8288
4. Test enrollment: `curl -X POST http://localhost:3000/api/enrollments ...`
5. Or use test script: `npm run inngest:test:pre`

### Viewing Jobs

- **Inngest Dashboard**: http://localhost:8288
- **Database**: Query `sent_messages` table
- **Console Logs**: Check terminal output

## Database Schema

### Core Tables
- `contacts` - Contact records with consent tracking
- `events` - Platform-agnostic events (Zoom, etc.)
- `registrations` - Contact-event relationships
- `sent_messages` - Message audit log with engagement
- `activities` - Universal activity timeline
- `message_templates` - Multi-channel message templates
- `campaigns` - Campaign configurations
- `integrations` - External platform credentials

See `/supabase/migrations/` for full schema.

## Documentation

- **Quick Start**: `/docs/inngest-quickstart.md`
- **Implementation Guide**: `/docs/inngest-implementation.md`
- **Product Requirements**: `/docs/product-requirements-v1.0.0.md`
- **Implementation Summary**: `/INNGEST_IMPLEMENTATION_SUMMARY.md`
- **Inngest Functions**: `/inngest/README.md`

## Environment Variables

### Development
```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Inngest (auto-generated)
INNGEST_EVENT_KEY=test
INNGEST_SIGNING_KEY=test

# Zoom
ZOOM_ACCOUNT_ID=abc-123
ZOOM_CLIENT_ID=xyz
ZOOM_CLIENT_SECRET=secret
```

### Production
```bash
# Inngest (get from app.inngest.com)
INNGEST_EVENT_KEY=prod_...
INNGEST_SIGNING_KEY=signkey-prod-...

# Email (get from resend.com)
RESEND_API_KEY=re_...

# SMS (get from twilio.com)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

## Deployment

### Vercel (Recommended)
```bash
vercel --prod
```

Configure environment variables in Vercel dashboard.

### Railway
```bash
railway up
```

Configure environment variables in Railway dashboard.

### Inngest Cloud Setup
1. Sign up at https://app.inngest.com
2. Create new app
3. Add production environment
4. Copy signing key and event key
5. Set webhook URL: `https://yourdomain.com/api/inngest`

## Monitoring

- **Inngest Dashboard**: https://app.inngest.com
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Zoom Dashboard**: https://marketplace.zoom.us/

## Support

- **Documentation**: See `/docs/` directory
- **Inngest Docs**: https://www.inngest.com/docs
- **Inngest Discord**: https://www.inngest.com/discord
- **Supabase Docs**: https://supabase.com/docs
- **Zoom Docs**: https://developers.zoom.us

## License

Private - Ceremonía Internal Use Only

---

**Version**: 1.0.0
**Last Updated**: 2025-09-30
**Status**: Ready for Testing
