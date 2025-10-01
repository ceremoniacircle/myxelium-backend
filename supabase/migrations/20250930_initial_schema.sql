-- Myxelium Database Schema v1.0.0
-- Created: 2025-09-30
-- Description: Webinar funnel orchestration tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CONTACTS TABLE
-- Stores all contacts with consent and preferences
-- =====================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,

  -- Consent tracking
  consent_email BOOLEAN DEFAULT TRUE,
  consent_sms BOOLEAN DEFAULT FALSE,
  consent_whatsapp BOOLEAN DEFAULT FALSE,
  consent_updated_at TIMESTAMPTZ,

  -- Preferences
  timezone TEXT DEFAULT 'America/Los_Angeles',
  locale TEXT DEFAULT 'en',

  -- Flexible custom fields (company, role, etc.)
  custom_fields JSONB DEFAULT '{}'::JSONB,

  -- Status
  status TEXT DEFAULT 'active', -- active | unsubscribed | bounced
  unsubscribed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for contacts
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_created_at ON contacts(created_at);

-- =====================================================
-- WEBINARS TABLE
-- Stores webinar details and Zoom integration data
-- =====================================================
CREATE TABLE webinars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,

  -- Zoom integration
  zoom_webinar_id TEXT UNIQUE NOT NULL,
  zoom_webinar_url TEXT,

  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  timezone TEXT DEFAULT 'America/Los_Angeles',

  -- Related assets
  landing_page_slug TEXT, -- Link to frontend page
  replay_url TEXT, -- For post-webinar emails

  -- Metadata for AI content generation
  offer_context JSONB, -- {offer: "...", pain_points: [...], benefits: [...]}

  -- Status
  status TEXT DEFAULT 'draft', -- draft | published | live | completed | cancelled
  completed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webinars
CREATE INDEX idx_webinars_zoom_id ON webinars(zoom_webinar_id);
CREATE INDEX idx_webinars_status ON webinars(status);
CREATE INDEX idx_webinars_scheduled_at ON webinars(scheduled_at);

-- =====================================================
-- ENROLLMENTS TABLE
-- Links contacts to webinars with Zoom registration data
-- =====================================================
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  webinar_id UUID REFERENCES webinars(id) ON DELETE CASCADE NOT NULL,

  -- Zoom registration data
  zoom_registrant_id TEXT,
  zoom_join_url TEXT, -- Unique join URL for this user

  -- Attendance tracking
  attended BOOLEAN DEFAULT FALSE,
  attended_at TIMESTAMPTZ,
  attended_duration_minutes INTEGER, -- From Zoom webhook

  -- Status tracking
  status TEXT DEFAULT 'registered', -- registered | confirmed | attended | no_show | cancelled

  -- Source tracking (where did they enroll from?)
  source TEXT, -- 'landing_page' | 'api' | 'manual'
  source_url TEXT,

  -- Custom data from enrollment form
  enrollment_data JSONB DEFAULT '{}'::JSONB,

  -- Timestamps
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one enrollment per contact per webinar
  UNIQUE(contact_id, webinar_id)
);

-- Indexes for enrollments
CREATE INDEX idx_enrollments_contact_id ON enrollments(contact_id);
CREATE INDEX idx_enrollments_webinar_id ON enrollments(webinar_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE INDEX idx_enrollments_attended ON enrollments(attended);
CREATE INDEX idx_enrollments_zoom_registrant_id ON enrollments(zoom_registrant_id);

-- =====================================================
-- CAMPAIGNS TABLE
-- Defines funnel sequences (steps, timing, conditions)
-- =====================================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,

  -- Trigger configuration
  trigger_event TEXT NOT NULL, -- 'webinar.enrolled' | 'webinar.completed' | etc.
  trigger_conditions JSONB, -- Additional conditions to match

  -- Associated webinar (optional - can be reusable across webinars)
  webinar_id UUID REFERENCES webinars(id) ON DELETE SET NULL,

  -- Campaign steps (array of step configs)
  steps JSONB NOT NULL,
  /* Example steps structure:
  [
    {
      "id": "step-1",
      "name": "Welcome Email",
      "delay": "0h",
      "channel": "email",
      "template_id": "uuid",
      "conditions": null
    },
    {
      "id": "step-2",
      "name": "24h Reminder",
      "delay": "24h",
      "relativeTo": "webinar.scheduledAt",
      "channel": ["email", "sms"],
      "template_id": "uuid",
      "conditions": {"status": "registered"}
    }
  ]
  */

  -- Brand/content context for AI generation
  brand_context JSONB,

  -- Campaign metadata
  type TEXT, -- 'pre_webinar' | 'post_webinar_attended' | 'post_webinar_noshow'
  priority INTEGER DEFAULT 0, -- For ordering when multiple campaigns match

  -- Status
  status TEXT DEFAULT 'active', -- active | paused | archived

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for campaigns
CREATE INDEX idx_campaigns_trigger_event ON campaigns(trigger_event);
CREATE INDEX idx_campaigns_webinar_id ON campaigns(webinar_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_type ON campaigns(type);

-- =====================================================
-- MESSAGE_TEMPLATES TABLE
-- Stores template metadata (actual content from external API)
-- =====================================================
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL, -- 'welcome-email', 'reminder-24h', etc.
  name TEXT NOT NULL,
  description TEXT,

  -- Channel and format
  channel TEXT NOT NULL, -- 'email' | 'sms' | 'whatsapp' | 'push'

  -- For email
  subject_template TEXT, -- Can include {{variables}}

  -- Content reference (external API or cached)
  content_api_url TEXT, -- URL to fetch from content generation API
  cached_content_html TEXT, -- Cached HTML (for emails)
  cached_content_text TEXT, -- Cached plaintext (for SMS/email)

  -- Template variables
  variables JSONB, -- ["firstName", "webinarTitle", "joinUrl", etc.]

  -- AI generation prompt (for reference/regeneration)
  generation_prompt TEXT,

  -- Brand guidelines reference
  brand_guidelines JSONB,

  -- Metadata
  generated_by TEXT DEFAULT 'ai', -- 'ai' | 'manual'
  version INTEGER DEFAULT 1,

  -- A/B testing
  is_variant BOOLEAN DEFAULT FALSE,
  parent_template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for message_templates
CREATE INDEX idx_message_templates_slug ON message_templates(slug);
CREATE INDEX idx_message_templates_channel ON message_templates(channel);
CREATE INDEX idx_message_templates_parent ON message_templates(parent_template_id);

-- =====================================================
-- SCHEDULED_JOBS TABLE
-- Tracks queued jobs (managed by Inngest but logged here)
-- =====================================================
CREATE TABLE scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Idempotency
  idempotency_key TEXT UNIQUE NOT NULL,

  -- References
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,

  -- Job details
  step_id TEXT, -- 'step-1', 'step-2' from campaign.steps
  step_name TEXT, -- Human-readable name

  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Execution
  status TEXT DEFAULT 'pending', -- pending | running | completed | failed | cancelled
  attempt INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,

  -- Job metadata
  job_type TEXT, -- 'send_email' | 'send_sms' | 'update_crm' | etc.
  payload JSONB, -- Full job data (contact info, content, etc.)

  -- Inngest integration
  inngest_event_id TEXT,
  inngest_run_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scheduled_jobs
CREATE INDEX idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX idx_scheduled_jobs_scheduled_at ON scheduled_jobs(scheduled_at);
CREATE INDEX idx_scheduled_jobs_enrollment_id ON scheduled_jobs(enrollment_id);
CREATE INDEX idx_scheduled_jobs_idempotency_key ON scheduled_jobs(idempotency_key);
CREATE INDEX idx_scheduled_jobs_inngest_run_id ON scheduled_jobs(inngest_run_id);

-- =====================================================
-- SENT_MESSAGES TABLE
-- Audit log of all sent messages with engagement tracking
-- =====================================================
CREATE TABLE sent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  job_id UUID REFERENCES scheduled_jobs(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Message details
  channel TEXT NOT NULL, -- 'email' | 'sms' | 'whatsapp'
  provider TEXT NOT NULL, -- 'resend' | 'twilio' | etc.
  provider_message_id TEXT, -- External tracking ID

  -- Content (what was actually sent)
  subject TEXT, -- For email
  body_html TEXT, -- For email
  body_text TEXT, -- For SMS or email plaintext

  -- Recipient info (snapshot at send time)
  recipient_email TEXT,
  recipient_phone TEXT,

  -- Delivery tracking
  status TEXT DEFAULT 'queued', -- queued | sent | delivered | opened | clicked | bounced | failed | unsubscribed

  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,

  -- Engagement tracking
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  links_clicked JSONB, -- [{url: "...", clicked_at: "..."}]

  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  bounce_type TEXT, -- 'hard' | 'soft'

  -- Provider-specific metadata
  provider_metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sent_messages
CREATE INDEX idx_sent_messages_contact_id ON sent_messages(contact_id);
CREATE INDEX idx_sent_messages_enrollment_id ON sent_messages(enrollment_id);
CREATE INDEX idx_sent_messages_status ON sent_messages(status);
CREATE INDEX idx_sent_messages_provider_message_id ON sent_messages(provider_message_id);
CREATE INDEX idx_sent_messages_sent_at ON sent_messages(sent_at);
CREATE INDEX idx_sent_messages_channel ON sent_messages(channel);
CREATE INDEX idx_sent_messages_campaign_id ON sent_messages(campaign_id);

-- =====================================================
-- WEBHOOK_EVENTS TABLE
-- Log all incoming webhooks for debugging/replay
-- =====================================================
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Provider info
  provider TEXT NOT NULL, -- 'resend' | 'twilio' | 'zoom'
  event_type TEXT NOT NULL, -- 'email.delivered' | 'sms.sent' | 'webinar.ended'

  -- Raw payload
  payload JSONB NOT NULL,
  headers JSONB, -- Request headers (for debugging)

  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,

  -- Signature verification
  signature_valid BOOLEAN,

  -- Related records (if matched)
  sent_message_id UUID REFERENCES sent_messages(id) ON DELETE SET NULL,
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE SET NULL,

  -- Timestamps
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook_events
CREATE INDEX idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_received_at ON webhook_events(received_at);

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- Automatically update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webinars_updated_at BEFORE UPDATE ON webinars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_jobs_updated_at BEFORE UPDATE ON scheduled_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sent_messages_updated_at BEFORE UPDATE ON sent_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA (for testing)
-- =====================================================

-- Sample webinar
INSERT INTO webinars (
  title,
  description,
  zoom_webinar_id,
  scheduled_at,
  duration_minutes,
  status,
  offer_context
) VALUES (
  'How to Build AI-Powered Funnels',
  'Learn how to automate your webinar enrollment and follow-up with AI-generated content',
  '123456789',
  NOW() + INTERVAL '7 days',
  60,
  'published',
  '{"offer": "Free funnel template", "pain_points": ["Manual enrollment", "Generic emails"], "benefits": ["Save time", "Higher conversions"]}'::JSONB
);

-- Sample contact
INSERT INTO contacts (
  email,
  first_name,
  last_name,
  phone,
  consent_email,
  consent_sms,
  timezone
) VALUES (
  'test@example.com',
  'Test',
  'User',
  '+15555551234',
  TRUE,
  TRUE,
  'America/Los_Angeles'
);

-- Sample message templates
INSERT INTO message_templates (slug, name, channel, subject_template, variables, generation_prompt) VALUES
  (
    'welcome-email',
    'Welcome Email',
    'email',
    'You''re registered for {{webinarTitle}}!',
    '["firstName", "webinarTitle", "webinarDate", "joinUrl"]'::JSONB,
    'Generate a warm welcome email confirming webinar registration'
  ),
  (
    'reminder-24h',
    '24 Hour Reminder Email',
    'email',
    'Tomorrow: {{webinarTitle}}',
    '["firstName", "webinarTitle", "webinarDate", "joinUrl"]'::JSONB,
    'Generate a friendly reminder email 24 hours before the webinar'
  ),
  (
    'reminder-1h',
    '1 Hour Reminder Email',
    'email',
    'Starting in 1 hour: {{webinarTitle}}',
    '["firstName", "webinarTitle", "joinUrl"]'::JSONB,
    'Generate an urgent reminder email 1 hour before the webinar'
  ),
  (
    'reminder-24h-sms',
    '24 Hour Reminder SMS',
    'sms',
    NULL,
    '["firstName", "webinarTitle", "joinUrl"]'::JSONB,
    'Generate a concise SMS reminder 24 hours before the webinar (max 160 chars)'
  ),
  (
    'thank-you-attended',
    'Thank You Email (Attended)',
    'email',
    'Thanks for joining {{webinarTitle}}!',
    '["firstName", "webinarTitle", "replayUrl"]'::JSONB,
    'Generate a thank you email for webinar attendees with replay link'
  );

-- Sample campaign (pre-webinar drip)
INSERT INTO campaigns (
  name,
  description,
  trigger_event,
  type,
  status,
  steps
) VALUES (
  'Pre-Webinar Drip Sequence',
  'Welcome email + reminders before webinar',
  'webinar.enrolled',
  'pre_webinar',
  'active',
  '[
    {
      "id": "step-1",
      "name": "Welcome Email",
      "delay": "0h",
      "channel": "email",
      "template_slug": "welcome-email",
      "conditions": null
    },
    {
      "id": "step-2",
      "name": "24h Reminder",
      "delay": "24h",
      "relativeTo": "webinar.scheduledAt",
      "channel": ["email", "sms"],
      "template_slug": "reminder-24h",
      "conditions": {"status": "registered"}
    },
    {
      "id": "step-3",
      "name": "1h Reminder",
      "delay": "1h",
      "relativeTo": "webinar.scheduledAt",
      "channel": ["email", "sms"],
      "template_slug": "reminder-1h",
      "conditions": {"status": "registered"}
    }
  ]'::JSONB
);

-- =====================================================
-- HELPFUL VIEWS (optional - for easier querying)
-- =====================================================

-- View: Enrollment summary with contact and webinar details
CREATE VIEW enrollment_summary AS
SELECT
  e.id AS enrollment_id,
  e.status AS enrollment_status,
  e.attended,
  e.enrolled_at,
  c.id AS contact_id,
  c.email,
  c.first_name,
  c.last_name,
  c.phone,
  w.id AS webinar_id,
  w.title AS webinar_title,
  w.scheduled_at AS webinar_date,
  w.status AS webinar_status
FROM enrollments e
JOIN contacts c ON e.contact_id = c.id
JOIN webinars w ON e.webinar_id = w.id;

-- View: Message engagement summary
CREATE VIEW message_engagement_summary AS
SELECT
  sm.id AS message_id,
  sm.channel,
  sm.status,
  sm.sent_at,
  sm.opened_at,
  sm.clicked_at,
  c.email AS contact_email,
  c.first_name,
  c.last_name,
  mt.name AS template_name,
  camp.name AS campaign_name
FROM sent_messages sm
JOIN contacts c ON sm.contact_id = c.id
LEFT JOIN message_templates mt ON sm.template_id = mt.id
LEFT JOIN campaigns camp ON sm.campaign_id = camp.id;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE contacts IS 'All contacts with consent and preferences';
COMMENT ON TABLE webinars IS 'Webinar details and Zoom integration data';
COMMENT ON TABLE enrollments IS 'Links contacts to webinars with attendance tracking';
COMMENT ON TABLE campaigns IS 'Funnel sequence definitions (steps, timing, conditions)';
COMMENT ON TABLE message_templates IS 'Template metadata (content from external API)';
COMMENT ON TABLE scheduled_jobs IS 'Queued jobs tracked alongside Inngest';
COMMENT ON TABLE sent_messages IS 'Audit log of all sent messages with engagement';
COMMENT ON TABLE webhook_events IS 'All incoming webhooks for debugging/replay';

COMMENT ON COLUMN enrollments.zoom_join_url IS 'Unique Zoom join URL for this user';
COMMENT ON COLUMN campaigns.steps IS 'Array of step configs with delays, channels, conditions';
COMMENT ON COLUMN scheduled_jobs.idempotency_key IS 'Prevents duplicate job execution';
COMMENT ON COLUMN sent_messages.links_clicked IS 'Array of clicked links with timestamps';
