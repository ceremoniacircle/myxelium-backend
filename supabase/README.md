# Supabase Database Setup

## Overview

This directory contains database migrations for the Myxelium webinar funnel orchestration system.

## Database Schema

### Core Tables

1. **contacts** - All contacts with consent and preferences
2. **webinars** - Webinar details and Zoom integration
3. **enrollments** - Links contacts to webinars with attendance tracking
4. **campaigns** - Funnel sequence definitions
5. **message_templates** - Template metadata (content from external API)
6. **scheduled_jobs** - Queued jobs (tracked alongside Inngest)
7. **sent_messages** - Audit log of all sent messages
8. **webhook_events** - Incoming webhooks for debugging

### Entity Relationships

```
contacts ──┐
           ├──< enrollments >── webinars
           └──< sent_messages
                    │
                    ├── scheduled_jobs ── campaigns
                    └── message_templates
```

## Applying Migrations

### Option 1: Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### Option 2: Manual SQL Execution

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `migrations/20250930_initial_schema.sql`
4. Paste and run

### Option 3: Supabase Studio

1. Open Supabase Studio
2. Go to SQL Editor
3. Create new query
4. Paste migration file contents
5. Execute

## Seed Data

The migration includes sample seed data:
- 1 test webinar (scheduled 7 days from now)
- 1 test contact
- 5 message templates (welcome, reminders, thank you)
- 1 pre-webinar campaign

## Verifying Installation

After running the migration, verify tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

Expected output:
- campaigns
- contacts
- enrollments
- message_templates
- scheduled_jobs
- sent_messages
- webhook_events
- webinars

## Helpful Views

The migration creates two views for easier querying:

- **enrollment_summary** - Enrollments with contact and webinar details
- **message_engagement_summary** - Messages with engagement metrics

## Next Steps

After applying the migration:

1. Set up Row Level Security (RLS) policies if needed
2. Configure Supabase Auth (optional)
3. Test with sample data
4. Connect your API to the database

## Troubleshooting

**Error: Extension "uuid-ossp" does not exist**
- Solution: Run `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` first

**Error: Permission denied**
- Solution: Ensure you're connected as a superuser or have CREATE privileges

**Migration already applied**
- Solution: Supabase tracks migrations, safe to re-run (idempotent)
