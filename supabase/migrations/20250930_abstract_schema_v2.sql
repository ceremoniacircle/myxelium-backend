-- Myxelium Abstract Schema v2.0
-- Multi-CRM, Multi-Channel Customer Engagement Platform
-- Created: 2025-09-30
-- Description: CRM-first architecture with multi-platform event system

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- =====================================================
-- 1. CONTACTS (CRM Core)
-- Universal contact records with multi-CRM sync
-- =====================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Core identity
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,

  -- External CRM mappings (can sync to multiple CRMs)
  external_mappings JSONB DEFAULT '[]'::JSONB,
  /* Example:
  [
    {
      "provider": "hubspot",
      "id": "12345",
      "url": "https://app.hubspot.com/contacts/12345",
      "synced_at": "2025-09-30T10:00:00Z",
      "sync_direction": "bidirectional"
    },
    {
      "provider": "gohighlevel",
      "id": "abc-xyz",
      "synced_at": "2025-09-30T10:00:00Z",
      "sync_direction": "push_only"
    }
  ]
  */

  -- Contact metadata
  timezone TEXT DEFAULT 'America/Los_Angeles',
  locale TEXT DEFAULT 'en',
  avatar_url TEXT,

  -- Consent tracking (GDPR/CCPA compliance)
  consent JSONB DEFAULT '{}'::JSONB,
  /* Example:
  {
    "email": {"granted": true, "updated_at": "2025-09-30T10:00:00Z", "ip": "192.168.1.1", "source": "form_submission"},
    "sms": {"granted": true, "updated_at": "2025-09-30T10:00:00Z", "ip": "192.168.1.1"},
    "whatsapp": {"granted": false},
    "marketing": {"granted": true, "updated_at": "2025-09-30T10:00:00Z"},
    "analytics": {"granted": true}
  }
  */

  -- Lifecycle stage (CRM standard)
  lifecycle_stage TEXT DEFAULT 'lead',
  /* subscriber | lead | mql | sql | opportunity | customer | evangelist | unqualified */

  -- Lead scoring
  lead_score INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'active',
  /* active | unsubscribed | bounced | deleted */

  -- Soft delete for GDPR compliance
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_lifecycle_stage CHECK (lifecycle_stage IN (
    'subscriber', 'lead', 'mql', 'sql', 'opportunity', 'customer', 'evangelist', 'unqualified'
  )),
  CONSTRAINT valid_status CHECK (status IN ('active', 'unsubscribed', 'bounced', 'deleted')),
  CONSTRAINT valid_lead_score CHECK (lead_score >= 0 AND lead_score <= 100)
);

-- Indexes for contacts
CREATE INDEX idx_contacts_email ON contacts(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_phone ON contacts(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_contacts_status ON contacts(status) WHERE status = 'active';
CREATE INDEX idx_contacts_lifecycle_stage ON contacts(lifecycle_stage);
CREATE INDEX idx_contacts_lead_score ON contacts(lead_score DESC);
CREATE INDEX idx_contacts_last_activity ON contacts(last_activity_at DESC);
CREATE INDEX idx_contacts_external_mappings ON contacts USING GIN(external_mappings);
CREATE INDEX idx_contacts_consent ON contacts USING GIN(consent);
CREATE INDEX idx_contacts_created_at ON contacts(created_at DESC);

-- Full text search on name and email
CREATE INDEX idx_contacts_search ON contacts USING GIN(
  to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(email, ''))
);

COMMENT ON TABLE contacts IS 'Universal contact records with multi-CRM synchronization support';
COMMENT ON COLUMN contacts.external_mappings IS 'Array of external CRM mappings (HubSpot, GoHighLevel, etc.)';
COMMENT ON COLUMN contacts.consent IS 'JSONB object tracking consent for email, SMS, WhatsApp, marketing, analytics';
COMMENT ON COLUMN contacts.lifecycle_stage IS 'Sales funnel position: subscriber → lead → MQL → SQL → opportunity → customer';

-- =====================================================
-- 2. CONTACT PROPERTIES (Custom Fields - CRM Standard)
-- Flexible key/value storage for custom contact data
-- =====================================================
CREATE TABLE contact_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,

  -- Property details
  property_name TEXT NOT NULL,
  property_value TEXT,
  property_type TEXT DEFAULT 'string',
  /* string | number | boolean | date | datetime | enum | url | email */

  -- External CRM field mapping
  crm_field_mappings JSONB DEFAULT '{}'::JSONB,
  /* Example:
  {
    "hubspot": "company_name",
    "gohighlevel": "custom_field_company",
    "salesforce": "Company__c",
    "activecampaign": "Company"
  }
  */

  -- Metadata
  source TEXT DEFAULT 'manual',
  /* manual | form | api | crm_sync | enrichment | import */
  last_synced_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(contact_id, property_name),
  CONSTRAINT valid_property_type CHECK (property_type IN (
    'string', 'number', 'boolean', 'date', 'datetime', 'enum', 'url', 'email'
  ))
);

-- Indexes for contact_properties
CREATE INDEX idx_contact_properties_contact_id ON contact_properties(contact_id);
CREATE INDEX idx_contact_properties_name ON contact_properties(property_name);
CREATE INDEX idx_contact_properties_value ON contact_properties(property_value);
CREATE INDEX idx_contact_properties_mappings ON contact_properties USING GIN(crm_field_mappings);

COMMENT ON TABLE contact_properties IS 'Custom fields for contacts with CRM field mappings (like HubSpot custom properties)';
COMMENT ON COLUMN contact_properties.crm_field_mappings IS 'Maps our property names to external CRM field names';

-- =====================================================
-- 3. TAGS (Flexible Categorization)
-- Tag system for segments, campaigns, behaviors
-- =====================================================
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  color TEXT, -- Hex color for UI (#FF5733)
  description TEXT,

  -- Tag type (for organization)
  category TEXT,
  /* segment | campaign | lifecycle | behavior | source | custom */

  -- External CRM mappings
  crm_tag_mappings JSONB DEFAULT '{}'::JSONB,
  /* Example:
  {
    "hubspot": {"type": "list", "id": "123", "name": "Webinar Attendees"},
    "gohighlevel": {"type": "tag", "id": "hot-lead"},
    "activecampaign": {"type": "tag", "id": "456"}
  }
  */

  -- Metadata
  is_system BOOLEAN DEFAULT FALSE, -- System tags can't be deleted
  usage_count INTEGER DEFAULT 0, -- How many contacts have this tag

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contact_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,

  -- Metadata
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  applied_by TEXT DEFAULT 'automation',
  /* user | automation | crm_sync | api | import */

  UNIQUE(contact_id, tag_id)
);

-- Indexes for tags
CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_tags_mappings ON tags USING GIN(crm_tag_mappings);

-- Indexes for contact_tags
CREATE INDEX idx_contact_tags_contact_id ON contact_tags(contact_id);
CREATE INDEX idx_contact_tags_tag_id ON contact_tags(tag_id);
CREATE INDEX idx_contact_tags_applied_at ON contact_tags(applied_at DESC);

COMMENT ON TABLE tags IS 'Flexible tagging system for segmentation (maps to CRM lists/tags)';
COMMENT ON TABLE contact_tags IS 'Junction table linking contacts to tags with metadata';

-- =====================================================
-- 4. EVENTS (Generic Event System)
-- Platform-agnostic events (webinars, workshops, etc.)
-- =====================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  /* webinar | workshop | consultation | course | masterclass |
     challenge | networking | conference | one_on_one | group_call | demo */

  -- Platform integration (abstracted)
  platform TEXT NOT NULL,
  /* zoom_webinar | zoom_meeting | google_meet | calendly | cal_com |
     teams | whereby | luma | lu_ma | eventbrite | in_person | virtual_custom */

  platform_event_id TEXT, -- External ID (e.g., Zoom webinar ID)
  platform_url TEXT, -- Link to platform event
  platform_metadata JSONB, -- Platform-specific data
  /* Example for Zoom:
  {
    "webinar_id": "123456789",
    "meeting_id": "987654321",
    "registration_url": "https://zoom.us/webinar/register/...",
    "host_id": "host@example.com",
    "passcode": "123456",
    "settings": {...}
  }
  */

  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  duration_minutes INTEGER DEFAULT 60,
  ends_at TIMESTAMPTZ, -- Calculated: scheduled_at + duration_minutes

  -- Event assets
  landing_page_slug TEXT,
  cover_image_url TEXT,
  replay_url TEXT,
  resources_url TEXT,

  -- Capacity
  max_registrations INTEGER, -- NULL = unlimited
  current_registrations INTEGER DEFAULT 0,

  -- Metadata for AI content generation
  content_context JSONB,
  /* Example:
  {
    "offer": "Free funnel template",
    "pain_points": ["Manual enrollment", "Generic emails"],
    "benefits": ["Save time", "Higher conversions"],
    "speaker": {"name": "Austin Mao", "bio": "...", "photo": "..."},
    "agenda": ["Introduction", "Demo", "Q&A"],
    "target_audience": "Marketing ops professionals"
  }
  */

  -- Status
  status TEXT DEFAULT 'draft',
  /* draft | scheduled | registration_open | registration_closed |
     live | completed | cancelled | postponed */

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_event_type CHECK (type IN (
    'webinar', 'workshop', 'consultation', 'course', 'masterclass',
    'challenge', 'networking', 'conference', 'one_on_one', 'group_call', 'demo'
  )),
  CONSTRAINT valid_event_status CHECK (status IN (
    'draft', 'scheduled', 'registration_open', 'registration_closed',
    'live', 'completed', 'cancelled', 'postponed'
  )),
  CONSTRAINT valid_duration CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  CONSTRAINT valid_capacity CHECK (max_registrations IS NULL OR max_registrations > 0)
);

-- Indexes for events
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_platform ON events(platform);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_scheduled_at ON events(scheduled_at);
CREATE INDEX idx_events_platform_event_id ON events(platform_event_id) WHERE platform_event_id IS NOT NULL;
CREATE INDEX idx_events_slug ON events(landing_page_slug) WHERE landing_page_slug IS NOT NULL;
CREATE UNIQUE INDEX idx_events_platform_unique ON events(platform, platform_event_id)
  WHERE platform_event_id IS NOT NULL;

COMMENT ON TABLE events IS 'Platform-agnostic events (webinars, workshops, consultations, etc.)';
COMMENT ON COLUMN events.platform_metadata IS 'Platform-specific data stored as JSONB for flexibility';
COMMENT ON COLUMN events.content_context IS 'Context for AI content generation (offers, pain points, benefits)';

-- =====================================================
-- 5. REGISTRATIONS (Generic Event Registration)
-- Links contacts to events with attendance tracking
-- =====================================================
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,

  -- Platform registration data
  platform_registrant_id TEXT,
  platform_join_url TEXT, -- Unique join URL for this user
  platform_metadata JSONB, -- Platform-specific data

  -- Attendance tracking
  attended BOOLEAN DEFAULT FALSE,
  attended_at TIMESTAMPTZ,
  attendance_duration_minutes INTEGER,
  engagement_score INTEGER, -- 0-100 based on participation
  /* Calculated from: attendance duration, questions asked, polls answered, etc. */

  -- Status
  status TEXT DEFAULT 'registered',
  /* registered | confirmed | waitlisted | attended | no_show | cancelled */

  -- Source tracking
  registration_source TEXT,
  /* landing_page | email_link | api | manual | crm_sync | import | referral */
  source_url TEXT,
  utm_params JSONB, -- UTM tracking
  /* Example:
  {
    "utm_source": "linkedin",
    "utm_medium": "social",
    "utm_campaign": "webinar-q4-2025",
    "utm_content": "organic-post",
    "utm_term": "marketing-automation"
  }
  */

  -- Registration form data
  form_data JSONB DEFAULT '{}'::JSONB,
  /* Capture any additional fields from registration form */

  -- Reminders sent tracking
  reminders_sent JSONB DEFAULT '[]'::JSONB,
  /* Track which reminders were sent:
  [
    {"type": "24h", "sent_at": "2025-09-30T10:00:00Z", "channel": "email", "message_id": "uuid"},
    {"type": "1h", "sent_at": "2025-09-30T11:00:00Z", "channel": "sms", "message_id": "uuid"}
  ]
  */

  -- Timestamps
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(contact_id, event_id),
  CONSTRAINT valid_registration_status CHECK (status IN (
    'registered', 'confirmed', 'waitlisted', 'attended', 'no_show', 'cancelled'
  )),
  CONSTRAINT valid_engagement_score CHECK (engagement_score IS NULL OR (engagement_score >= 0 AND engagement_score <= 100))
);

-- Indexes for registrations
CREATE INDEX idx_registrations_contact_id ON registrations(contact_id);
CREATE INDEX idx_registrations_event_id ON registrations(event_id);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_registrations_attended ON registrations(attended);
CREATE INDEX idx_registrations_platform_id ON registrations(platform_registrant_id) WHERE platform_registrant_id IS NOT NULL;
CREATE INDEX idx_registrations_source ON registrations(registration_source);
CREATE INDEX idx_registrations_utm ON registrations USING GIN(utm_params);
CREATE INDEX idx_registrations_registered_at ON registrations(registered_at DESC);

COMMENT ON TABLE registrations IS 'Links contacts to events with attendance and engagement tracking';
COMMENT ON COLUMN registrations.engagement_score IS 'Calculated score 0-100 based on attendance duration and participation';
COMMENT ON COLUMN registrations.utm_params IS 'UTM parameters for attribution tracking';

-- =====================================================
-- 6. ACTIVITIES (Universal Activity Log)
-- HubSpot-style timeline of all contact interactions
-- =====================================================
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,

  -- Activity details
  activity_type TEXT NOT NULL,
  /* Standard types:
     Email: email_sent | email_opened | email_clicked | email_bounced | email_replied
     SMS: sms_sent | sms_delivered | sms_clicked | sms_replied
     Web: page_viewed | form_submitted | file_downloaded | link_clicked
     Events: event_registered | event_attended | event_no_show | event_cancelled
     Calls: call_completed | call_scheduled | call_cancelled | call_no_answer
     Meetings: meeting_scheduled | meeting_completed | meeting_cancelled
     CRM: property_changed | tag_added | tag_removed | lifecycle_stage_changed | note_added
     Deals: deal_created | deal_updated | deal_won | deal_lost
  */

  -- Activity metadata
  activity_data JSONB NOT NULL,
  /* Flexible structure based on activity_type:
  For email_opened: {
    "message_id": "uuid",
    "subject": "Welcome to our webinar",
    "campaign_id": "uuid",
    "template_id": "uuid",
    "open_count": 2
  }
  For page_viewed: {
    "url": "/landing/webinar",
    "title": "How to Build AI Funnels",
    "duration_seconds": 45,
    "referrer": "https://linkedin.com"
  }
  For event_registered: {
    "event_id": "uuid",
    "event_title": "AI Webinar",
    "registration_id": "uuid"
  }
  */

  -- Related entities (polymorphic)
  related_to_type TEXT,
  /* registration | message | event | campaign | deal | note | task */
  related_to_id UUID,

  -- Source/attribution
  source TEXT DEFAULT 'automation',
  /* automation | manual | crm_sync | webhook | api | import */

  -- CRM sync
  synced_to_crms JSONB DEFAULT '[]'::JSONB,
  /* Track which CRMs this activity was synced to:
  [
    {
      "provider": "hubspot",
      "activity_id": "123",
      "activity_type": "EMAIL_OPEN",
      "synced_at": "2025-09-30T10:00:00Z"
    },
    {
      "provider": "gohighlevel",
      "note_id": "xyz",
      "synced_at": "2025-09-30T10:00:00Z"
    }
  ]
  */

  -- Timestamps
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activities
CREATE INDEX idx_activities_contact_id ON activities(contact_id);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_occurred_at ON activities(occurred_at DESC);
CREATE INDEX idx_activities_related_to ON activities(related_to_type, related_to_id)
  WHERE related_to_type IS NOT NULL;
CREATE INDEX idx_activities_data ON activities USING GIN(activity_data);
CREATE INDEX idx_activities_source ON activities(source);

COMMENT ON TABLE activities IS 'Universal activity log for all contact interactions (HubSpot-style timeline)';
COMMENT ON COLUMN activities.activity_data IS 'Flexible JSONB structure containing activity-specific data';
COMMENT ON COLUMN activities.synced_to_crms IS 'Tracks which external CRMs received this activity';

-- =====================================================
-- 7. INTEGRATIONS (External System Configs)
-- Store credentials and configs for external platforms
-- =====================================================
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Provider details
  provider TEXT UNIQUE NOT NULL,
  /* hubspot | gohighlevel | salesforce | activecampaign | mailchimp |
     zoom | calendly | stripe | google_calendar | slack | discord */

  display_name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,

  provider_type TEXT NOT NULL,
  /* crm | email_provider | sms_provider | event_platform |
     payment | calendar | analytics | communication */

  -- Authentication
  auth_type TEXT NOT NULL,
  /* api_key | oauth2 | oauth1 | basic_auth | jwt | server_to_server */

  credentials JSONB NOT NULL,
  /* ENCRYPTED credentials (structure varies by provider):
  For API key: {"api_key": "ENCRYPTED_VALUE"}
  For OAuth2: {
    "access_token": "ENCRYPTED_VALUE",
    "refresh_token": "ENCRYPTED_VALUE",
    "expires_at": "2025-12-31T23:59:59Z",
    "token_type": "Bearer"
  }
  For HubSpot: {
    "access_token": "ENCRYPTED_VALUE",
    "refresh_token": "ENCRYPTED_VALUE",
    "portal_id": "12345678"
  }
  For Zoom: {
    "account_id": "abc-123",
    "client_id": "xyz",
    "client_secret": "ENCRYPTED_VALUE"
  }
  */

  -- Configuration
  config JSONB DEFAULT '{}'::JSONB,
  /* Provider-specific settings:
  For CRM: {
    "sync_direction": "bidirectional",
    "sync_frequency": "realtime",
    "sync_contacts": true,
    "sync_activities": true,
    "sync_tags": true,
    "object_mappings": {
      "contacts": "contacts",
      "events": "deals",
      "registrations": "deal_stages"
    }
  }
  For Email: {
    "from_email": "events@ceremonia.com",
    "from_name": "Ceremonia Events",
    "reply_to": "support@ceremonia.com",
    "track_opens": true,
    "track_clicks": true
  }
  */

  -- Field mappings (CRM-specific)
  field_mappings JSONB DEFAULT '{}'::JSONB,
  /* Map our fields to provider fields:
  {
    "first_name": {"hubspot": "firstname", "gohighlevel": "first_name", "salesforce": "FirstName"},
    "last_name": {"hubspot": "lastname", "gohighlevel": "last_name", "salesforce": "LastName"},
    "company": {"hubspot": "company", "gohighlevel": "custom_company", "salesforce": "Company__c"},
    "lead_score": {"hubspot": "hs_lead_score", "gohighlevel": "score", "salesforce": "Lead_Score__c"}
  }
  */

  -- Capabilities
  capabilities JSONB DEFAULT '{}'::JSONB,
  /* What this integration can do:
  {
    "sync_contacts": true,
    "sync_activities": true,
    "create_events": true,
    "send_messages": true,
    "webhooks": true,
    "real_time": true,
    "bulk_operations": true,
    "rate_limit": 10000
  }
  */

  -- Status
  status TEXT DEFAULT 'active',
  /* active | paused | error | disconnected | pending_auth */

  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,

  -- Webhooks
  webhook_url TEXT, -- URL to receive webhooks from provider
  webhook_secret TEXT, -- For signature verification

  -- Rate limiting
  rate_limit_per_second INTEGER,
  rate_limit_per_day INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_integration_status CHECK (status IN (
    'active', 'paused', 'error', 'disconnected', 'pending_auth'
  ))
);

-- Indexes for integrations
CREATE INDEX idx_integrations_provider ON integrations(provider);
CREATE INDEX idx_integrations_type ON integrations(provider_type);
CREATE INDEX idx_integrations_status ON integrations(status);

COMMENT ON TABLE integrations IS 'External system configurations and credentials (HubSpot, GoHighLevel, Zoom, etc.)';
COMMENT ON COLUMN integrations.credentials IS 'ENCRYPTED authentication credentials (must be encrypted at rest)';
COMMENT ON COLUMN integrations.field_mappings IS 'Maps our schema fields to external CRM field names';

-- =====================================================
-- 8. CRM_SYNC_LOGS (Audit Trail)
-- Track all sync operations with external CRMs
-- =====================================================
CREATE TABLE crm_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Integration reference
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL, -- Denormalized for easier querying

  -- Sync details
  sync_type TEXT NOT NULL,
  /* contact_create | contact_update | contact_delete |
     activity_create | tag_sync | property_sync |
     bulk_import | webhook_received | manual_sync */

  sync_direction TEXT NOT NULL,
  /* push | pull | bidirectional */

  -- Entity reference
  entity_type TEXT NOT NULL,
  /* contact | activity | tag | property | event | registration */
  entity_id UUID, -- Our internal ID
  external_id TEXT, -- CRM's ID

  -- Sync result
  status TEXT NOT NULL,
  /* success | failed | partial | skipped | rate_limited */

  -- Data payload
  payload JSONB, -- What was sent/received
  response JSONB, -- Provider response

  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  error_details JSONB,

  -- Performance
  duration_ms INTEGER,

  -- Retry information
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,

  -- Timestamps
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_sync_status CHECK (status IN (
    'success', 'failed', 'partial', 'skipped', 'rate_limited'
  ))
);

-- Indexes for crm_sync_logs
CREATE INDEX idx_crm_sync_logs_integration_id ON crm_sync_logs(integration_id);
CREATE INDEX idx_crm_sync_logs_provider ON crm_sync_logs(provider);
CREATE INDEX idx_crm_sync_logs_type ON crm_sync_logs(sync_type);
CREATE INDEX idx_crm_sync_logs_status ON crm_sync_logs(status);
CREATE INDEX idx_crm_sync_logs_entity ON crm_sync_logs(entity_type, entity_id);
CREATE INDEX idx_crm_sync_logs_synced_at ON crm_sync_logs(synced_at DESC);
CREATE INDEX idx_crm_sync_logs_retry ON crm_sync_logs(next_retry_at)
  WHERE status = 'failed' AND retry_count < max_retries;

COMMENT ON TABLE crm_sync_logs IS 'Audit trail of all CRM synchronization operations';
COMMENT ON COLUMN crm_sync_logs.duration_ms IS 'Sync operation duration in milliseconds for performance monitoring';

-- =====================================================
-- 9. CAMPAIGNS (Orchestration Engine)
-- Define multi-step, multi-channel sequences
-- =====================================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,

  -- Trigger configuration
  trigger_event TEXT NOT NULL,
  /* event.registered | event.attended | event.no_show | event.cancelled |
     tag.added | lifecycle_stage.changed | property.changed |
     form.submitted | page.viewed | link.clicked | manual */

  trigger_conditions JSONB,
  /* Additional conditions to match:
  {
    "event_type": "webinar",
    "tag_slug": "hot-lead",
    "lifecycle_stage": "mql",
    "property_filters": {"company": {"operator": "contains", "value": "Tech"}}
  }
  */

  -- Associated event (optional - can be reusable across events)
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Campaign steps (array of step configs)
  steps JSONB NOT NULL,
  /* Example:
  [
    {
      "id": "step-1",
      "name": "Welcome Email",
      "delay": "0h",
      "channel": "email",
      "template_slug": "welcome-email",
      "conditions": null,
      "ab_test": null
    },
    {
      "id": "step-2",
      "name": "24h Reminder",
      "delay": "24h",
      "relativeTo": "event.scheduledAt",
      "channel": ["email", "sms"],
      "template_slug": "reminder-24h",
      "conditions": {"status": "registered", "!tag": "unsubscribed"}
    },
    {
      "id": "step-3",
      "name": "Branch: Attended vs No-Show",
      "type": "branch",
      "condition": {"field": "attended", "operator": "equals", "value": true},
      "branches": {
        "true": ["step-4a", "step-5a"],
        "false": ["step-4b", "step-5b"]
      }
    }
  ]
  */

  -- Brand/content context for AI generation
  brand_context JSONB,

  -- Campaign metadata
  type TEXT,
  /* pre_event | post_event_attended | post_event_noshow |
     nurture | onboarding | re_engagement | upsell */

  priority INTEGER DEFAULT 0, -- For ordering when multiple campaigns match

  -- Goals and metrics
  goal TEXT, -- What this campaign aims to achieve
  success_metrics JSONB, -- KPIs to track

  -- Status
  status TEXT DEFAULT 'active',
  /* active | paused | archived | testing */

  -- Stats
  total_enrolled INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_campaign_status CHECK (status IN ('active', 'paused', 'archived', 'testing'))
);

-- Indexes for campaigns
CREATE INDEX idx_campaigns_trigger_event ON campaigns(trigger_event);
CREATE INDEX idx_campaigns_event_id ON campaigns(event_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_type ON campaigns(type);
CREATE INDEX idx_campaigns_priority ON campaigns(priority DESC);

COMMENT ON TABLE campaigns IS 'Multi-step, multi-channel campaign sequences with branching logic';
COMMENT ON COLUMN campaigns.steps IS 'Array of step configurations with delays, channels, conditions, and branching';

-- =====================================================
-- 10. MESSAGE_TEMPLATES (Multi-Channel Content)
-- Template metadata with external content references
-- =====================================================
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Channel and format
  channel TEXT NOT NULL,
  /* email | sms | whatsapp | push | in_app | voice */

  -- For email
  subject_template TEXT,
  preheader_template TEXT,

  -- Content source
  content_source TEXT DEFAULT 'external_api',
  /* external_api | cached | manual | ai_generated */

  content_api_url TEXT, -- URL to fetch from content generation API
  cached_content_html TEXT, -- Cached HTML (for emails)
  cached_content_text TEXT, -- Cached plaintext (for SMS/email)

  -- Variables
  variables JSONB,
  /* ["firstName", "lastName", "eventTitle", "eventDate", "joinUrl", "replayUrl"] */
  required_variables JSONB,
  /* Variables that MUST be provided: ["firstName", "joinUrl"] */

  -- AI generation
  generation_prompt TEXT,
  brand_context JSONB,

  -- A/B testing
  is_variant BOOLEAN DEFAULT FALSE,
  parent_template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  variant_name TEXT, -- 'A', 'B', 'C', 'control'

  -- CRM integration
  sync_to_crm BOOLEAN DEFAULT FALSE,
  crm_template_mappings JSONB,
  /* Map to CRM email templates:
  {
    "hubspot": {"template_id": "123", "name": "Welcome Email"},
    "gohighlevel": {"template_id": "abc"}
  }
  */

  -- Performance tracking
  times_sent INTEGER DEFAULT 0,
  avg_open_rate DECIMAL(5,2), -- 0.00 to 100.00
  avg_click_rate DECIMAL(5,2),

  -- Version control
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_channel CHECK (channel IN (
    'email', 'sms', 'whatsapp', 'push', 'in_app', 'voice'
  ))
);

-- Indexes for message_templates
CREATE INDEX idx_message_templates_slug ON message_templates(slug);
CREATE INDEX idx_message_templates_channel ON message_templates(channel);
CREATE INDEX idx_message_templates_parent ON message_templates(parent_template_id)
  WHERE parent_template_id IS NOT NULL;
CREATE INDEX idx_message_templates_active ON message_templates(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE message_templates IS 'Multi-channel message templates with external content API integration';
COMMENT ON COLUMN message_templates.content_api_url IS 'URL to fetch generated content from external content API';

-- =====================================================
-- 11. SENT_MESSAGES (Message Audit Log)
-- Track all sent messages with engagement metrics
-- =====================================================
CREATE TABLE sent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,

  -- Message details
  channel TEXT NOT NULL,
  provider TEXT NOT NULL, -- resend | sendgrid | twilio | etc.
  provider_message_id TEXT, -- External tracking ID

  -- Content (what was actually sent)
  subject TEXT,
  body_html TEXT,
  body_text TEXT,

  -- Recipient (snapshot at send time)
  recipient_email TEXT,
  recipient_phone TEXT,

  -- Delivery tracking
  status TEXT DEFAULT 'queued',
  /* queued | sent | delivered | opened | clicked | bounced | failed | unsubscribed | spam */

  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  first_clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  spam_reported_at TIMESTAMPTZ,

  -- Engagement metrics
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  links_clicked JSONB DEFAULT '[]'::JSONB,
  /* Track all clicked links:
  [
    {"url": "https://example.com/webinar", "clicked_at": "2025-09-30T10:00:00Z", "click_count": 2},
    {"url": "https://example.com/register", "clicked_at": "2025-09-30T10:05:00Z", "click_count": 1}
  ]
  */

  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  bounce_type TEXT, -- hard | soft | technical
  bounce_reason TEXT,

  -- CRM sync
  synced_to_crms JSONB DEFAULT '[]'::JSONB,
  /* Track if/when synced to CRMs as activities:
  [
    {
      "provider": "hubspot",
      "activity_id": "123",
      "activity_type": "EMAIL_SENT",
      "synced_at": "2025-09-30T10:00:00Z"
    }
  ]
  */

  -- Provider metadata
  provider_metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_message_status CHECK (status IN (
    'queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed', 'spam'
  ))
);

-- Indexes for sent_messages
CREATE INDEX idx_sent_messages_contact_id ON sent_messages(contact_id);
CREATE INDEX idx_sent_messages_registration_id ON sent_messages(registration_id);
CREATE INDEX idx_sent_messages_campaign_id ON sent_messages(campaign_id);
CREATE INDEX idx_sent_messages_status ON sent_messages(status);
CREATE INDEX idx_sent_messages_provider_message_id ON sent_messages(provider_message_id)
  WHERE provider_message_id IS NOT NULL;
CREATE INDEX idx_sent_messages_sent_at ON sent_messages(sent_at DESC);
CREATE INDEX idx_sent_messages_channel ON sent_messages(channel);
CREATE INDEX idx_sent_messages_provider ON sent_messages(provider);

COMMENT ON TABLE sent_messages IS 'Audit log of all sent messages with comprehensive engagement tracking';
COMMENT ON COLUMN sent_messages.links_clicked IS 'Array of all clicked links with timestamps and click counts';

-- =====================================================
-- 12. WEBHOOK_EVENTS (Debugging & Replay)
-- Log all incoming webhooks for troubleshooting
-- =====================================================
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Provider info
  provider TEXT NOT NULL,
  /* resend | twilio | zoom | hubspot | stripe | calendly | etc. */

  event_type TEXT NOT NULL,
  /* email.delivered | email.opened | sms.sent | zoom.webinar.ended | etc. */

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
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Timestamps
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook_events
CREATE INDEX idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_received_at ON webhook_events(received_at DESC);
CREATE INDEX idx_webhook_events_sent_message ON webhook_events(sent_message_id)
  WHERE sent_message_id IS NOT NULL;

COMMENT ON TABLE webhook_events IS 'Raw webhook event log for debugging and replay capabilities';

-- =====================================================
-- TRIGGERS (Auto-update timestamps)
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_properties_updated_at BEFORE UPDATE ON contact_properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sent_messages_updated_at BEFORE UPDATE ON sent_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGERS (Business Logic)
-- =====================================================

-- Calculate event ends_at automatically
CREATE OR REPLACE FUNCTION calculate_event_ends_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ends_at = NEW.scheduled_at + (NEW.duration_minutes || ' minutes')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_event_ends_at_trigger
  BEFORE INSERT OR UPDATE OF scheduled_at, duration_minutes ON events
  FOR EACH ROW
  EXECUTE FUNCTION calculate_event_ends_at();

-- Update contact last_activity_at when activity is created
CREATE OR REPLACE FUNCTION update_contact_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contacts
  SET last_activity_at = NEW.occurred_at
  WHERE id = NEW.contact_id
    AND (last_activity_at IS NULL OR last_activity_at < NEW.occurred_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contact_activity AFTER INSERT ON activities
  FOR EACH ROW EXECUTE FUNCTION update_contact_last_activity();

-- Update event current_registrations counter
CREATE OR REPLACE FUNCTION update_event_registration_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE events
    SET current_registrations = current_registrations + 1
    WHERE id = NEW.event_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE events
    SET current_registrations = GREATEST(0, current_registrations - 1)
    WHERE id = OLD.event_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_count AFTER INSERT OR DELETE ON registrations
  FOR EACH ROW EXECUTE FUNCTION update_event_registration_count();

-- Update tag usage_count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE tags
    SET usage_count = usage_count + 1
    WHERE id = NEW.tag_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE tags
    SET usage_count = GREATEST(0, usage_count - 1)
    WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tag_count AFTER INSERT OR DELETE ON contact_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- =====================================================
-- HELPFUL VIEWS
-- =====================================================

-- View: Contact summary with enriched data
CREATE VIEW contact_summary AS
SELECT
  c.id,
  c.email,
  c.first_name,
  c.last_name,
  c.phone,
  c.lifecycle_stage,
  c.lead_score,
  c.status,
  c.last_activity_at,
  c.created_at,
  -- Count of properties
  (SELECT COUNT(*) FROM contact_properties WHERE contact_id = c.id) AS property_count,
  -- Count of tags
  (SELECT COUNT(*) FROM contact_tags WHERE contact_id = c.id) AS tag_count,
  -- Count of registrations
  (SELECT COUNT(*) FROM registrations WHERE contact_id = c.id) AS registration_count,
  -- Count of activities
  (SELECT COUNT(*) FROM activities WHERE contact_id = c.id) AS activity_count,
  -- Count of sent messages
  (SELECT COUNT(*) FROM sent_messages WHERE contact_id = c.id) AS message_count,
  -- External CRM mappings
  c.external_mappings
FROM contacts c
WHERE c.deleted_at IS NULL;

-- View: Event summary with registration stats
CREATE VIEW event_summary AS
SELECT
  e.id,
  e.title,
  e.type,
  e.platform,
  e.scheduled_at,
  e.duration_minutes,
  e.status,
  e.current_registrations,
  e.max_registrations,
  -- Registration stats
  (SELECT COUNT(*) FROM registrations WHERE event_id = e.id AND status = 'registered') AS registered_count,
  (SELECT COUNT(*) FROM registrations WHERE event_id = e.id AND attended = TRUE) AS attended_count,
  (SELECT COUNT(*) FROM registrations WHERE event_id = e.id AND status = 'no_show') AS no_show_count,
  -- Attendance rate
  CASE
    WHEN e.current_registrations > 0 THEN
      ROUND(100.0 * (SELECT COUNT(*) FROM registrations WHERE event_id = e.id AND attended = TRUE) / e.current_registrations, 2)
    ELSE 0
  END AS attendance_rate_percent,
  e.created_at
FROM events e;

-- View: Message engagement summary
CREATE VIEW message_engagement_summary AS
SELECT
  sm.id AS message_id,
  sm.channel,
  sm.status,
  sm.sent_at,
  sm.delivered_at,
  sm.opened_at,
  sm.first_clicked_at,
  sm.open_count,
  sm.click_count,
  c.email AS contact_email,
  c.first_name,
  c.last_name,
  mt.name AS template_name,
  camp.name AS campaign_name,
  e.title AS event_title
FROM sent_messages sm
JOIN contacts c ON sm.contact_id = c.id
LEFT JOIN message_templates mt ON sm.template_id = mt.id
LEFT JOIN campaigns camp ON sm.campaign_id = camp.id
LEFT JOIN registrations r ON sm.registration_id = r.id
LEFT JOIN events e ON r.event_id = e.id;

-- View: CRM sync status
CREATE VIEW crm_sync_status AS
SELECT
  i.provider,
  i.display_name,
  i.status AS integration_status,
  i.last_sync_at,
  -- Sync stats from last 24 hours
  (SELECT COUNT(*) FROM crm_sync_logs WHERE integration_id = i.id AND synced_at > NOW() - INTERVAL '24 hours' AND status = 'success') AS sync_success_24h,
  (SELECT COUNT(*) FROM crm_sync_logs WHERE integration_id = i.id AND synced_at > NOW() - INTERVAL '24 hours' AND status = 'failed') AS sync_failed_24h,
  -- Total synced contacts
  (SELECT COUNT(DISTINCT c.id) FROM contacts c, jsonb_array_elements(c.external_mappings) AS mapping WHERE mapping->>'provider' = i.provider) AS synced_contacts_count,
  i.created_at
FROM integrations i;

-- =====================================================
-- SEED DATA (for testing)
-- =====================================================

-- Sample integrations
INSERT INTO integrations (provider, display_name, provider_type, auth_type, credentials, config, capabilities) VALUES
  (
    'hubspot',
    'HubSpot CRM',
    'crm',
    'oauth2',
    '{"access_token": "PLACEHOLDER", "refresh_token": "PLACEHOLDER", "portal_id": "12345678"}'::JSONB,
    '{"sync_direction": "bidirectional", "sync_contacts": true, "sync_activities": true}'::JSONB,
    '{"sync_contacts": true, "sync_activities": true, "webhooks": true, "real_time": true}'::JSONB
  ),
  (
    'zoom',
    'Zoom',
    'event_platform',
    'server_to_server',
    '{"account_id": "PLACEHOLDER", "client_id": "PLACEHOLDER", "client_secret": "PLACEHOLDER"}'::JSONB,
    '{"default_duration": 60}'::JSONB,
    '{"create_webinars": true, "create_meetings": true, "webhooks": true}'::JSONB
  );

-- Sample tags
INSERT INTO tags (name, slug, color, category, is_system) VALUES
  ('Hot Lead', 'hot-lead', '#FF5733', 'segment', FALSE),
  ('Webinar Attendee', 'webinar-attendee', '#3498DB', 'behavior', FALSE),
  ('VIP', 'vip', '#F1C40F', 'segment', FALSE),
  ('Newsletter Subscriber', 'newsletter-subscriber', '#2ECC71', 'segment', FALSE),
  ('Event Registered', 'event-registered', '#9B59B6', 'behavior', TRUE);

-- Sample contact
INSERT INTO contacts (email, first_name, last_name, phone, lifecycle_stage, lead_score, consent) VALUES
  (
    'austin@ceremonia.com',
    'Austin',
    'Mao',
    '+15555551234',
    'customer',
    85,
    '{"email": {"granted": true, "updated_at": "2025-09-30T10:00:00Z"}, "sms": {"granted": true, "updated_at": "2025-09-30T10:00:00Z"}}'::JSONB
  );

-- Sample contact properties
INSERT INTO contact_properties (contact_id, property_name, property_value, property_type, crm_field_mappings)
SELECT
  id,
  'company',
  'Ceremonia',
  'string',
  '{"hubspot": "company", "gohighlevel": "custom_company"}'::JSONB
FROM contacts WHERE email = 'austin@ceremonia.com';

-- Sample event
INSERT INTO events (title, description, type, platform, platform_event_id, scheduled_at, duration_minutes, status, content_context) VALUES
  (
    'How to Build AI-Powered Funnels',
    'Learn how to automate your webinar enrollment and follow-up with AI-generated content',
    'webinar',
    'zoom_webinar',
    '123456789',
    NOW() + INTERVAL '7 days',
    60,
    'scheduled',
    '{"offer": "Free funnel template", "pain_points": ["Manual enrollment", "Generic emails"], "benefits": ["Save time", "Higher conversions"]}'::JSONB
  );

-- Sample message templates
INSERT INTO message_templates (slug, name, channel, subject_template, variables, required_variables, generation_prompt) VALUES
  (
    'welcome-email',
    'Welcome Email',
    'email',
    'You''re registered for {{eventTitle}}!',
    '["firstName", "eventTitle", "eventDate", "joinUrl"]'::JSONB,
    '["firstName", "joinUrl"]'::JSONB,
    'Generate a warm welcome email confirming event registration'
  ),
  (
    'reminder-24h',
    '24 Hour Reminder',
    'email',
    'Tomorrow: {{eventTitle}}',
    '["firstName", "eventTitle", "eventDate", "joinUrl"]'::JSONB,
    '["firstName", "joinUrl"]'::JSONB,
    'Generate a friendly reminder email 24 hours before the event'
  ),
  (
    'reminder-24h-sms',
    '24 Hour Reminder SMS',
    'sms',
    NULL,
    '["firstName", "eventTitle", "joinUrl"]'::JSONB,
    '["joinUrl"]'::JSONB,
    'Generate a concise SMS reminder 24 hours before the event (max 160 chars)'
  );

-- Sample campaign
INSERT INTO campaigns (name, description, trigger_event, type, status, steps) VALUES
  (
    'Pre-Event Drip Sequence',
    'Welcome email + reminders before event',
    'event.registered',
    'pre_event',
    'active',
    '[
      {
        "id": "step-1",
        "name": "Welcome Email",
        "delay": "0h",
        "channel": "email",
        "template_slug": "welcome-email"
      },
      {
        "id": "step-2",
        "name": "24h Reminder",
        "delay": "24h",
        "relativeTo": "event.scheduledAt",
        "channel": ["email", "sms"],
        "template_slug": "reminder-24h",
        "conditions": {"status": "registered"}
      }
    ]'::JSONB
  );

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Myxelium Abstract Schema v2.0 - COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created: 12 core tables + 3 views';
  RAISE NOTICE 'Triggers: 6 automatic triggers';
  RAISE NOTICE 'Seed data: Sample integrations, contacts, events, templates';
  RAISE NOTICE '========================================';
END $$;
