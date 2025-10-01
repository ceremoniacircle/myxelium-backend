# Abstract Schema Design v2.0
*Multi-CRM, Multi-Channel Customer Engagement Platform*

## Overview

This schema treats the system as:
1. **CRM Layer**: Contacts, properties, tags, activities
2. **Event System**: Any type of event (webinars, workshops, consultations, etc.)
3. **Campaign Orchestration**: Multi-channel messaging with CRM sync
4. **Integration Layer**: Pluggable external systems (HubSpot, GoHighLevel, Zoom, etc.)

---

## Core Entities

### 1. Contacts (CRM Core)

```sql
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

  -- Consent (GDPR/CCPA compliance)
  consent JSONB DEFAULT '{}'::JSONB,
  /* Example:
  {
    "email": {"granted": true, "updated_at": "...", "ip": "..."},
    "sms": {"granted": true, "updated_at": "...", "ip": "..."},
    "whatsapp": {"granted": false},
    "marketing": {"granted": true, "updated_at": "..."},
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

  -- Soft delete for GDPR
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_status ON contacts(status) WHERE status = 'active';
CREATE INDEX idx_contacts_lifecycle_stage ON contacts(lifecycle_stage);
CREATE INDEX idx_contacts_lead_score ON contacts(lead_score);
CREATE INDEX idx_contacts_external_mappings ON contacts USING GIN(external_mappings);
```

---

### 2. Contact Properties (Custom Fields - CRM Standard)

```sql
CREATE TABLE contact_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,

  -- Property details
  property_name TEXT NOT NULL, -- 'company' | 'job_title' | 'industry' | etc.
  property_value TEXT, -- String representation
  property_type TEXT DEFAULT 'string', -- 'string' | 'number' | 'boolean' | 'date' | 'enum'

  -- External CRM field mapping
  crm_field_mappings JSONB DEFAULT '{}'::JSONB,
  /* Example:
  {
    "hubspot": "company_name",
    "gohighlevel": "custom_field_company",
    "salesforce": "Company__c"
  }
  */

  -- Metadata
  source TEXT DEFAULT 'manual', -- 'manual' | 'form' | 'api' | 'crm_sync' | 'enrichment'
  last_synced_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(contact_id, property_name)
);

CREATE INDEX idx_contact_properties_contact_id ON contact_properties(contact_id);
CREATE INDEX idx_contact_properties_name ON contact_properties(property_name);
CREATE INDEX idx_contact_properties_mappings ON contact_properties USING GIN(crm_field_mappings);
```

---

### 3. Tags (Flexible Categorization - CRM Standard)

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  color TEXT, -- Hex color for UI
  description TEXT,

  -- Tag type (for organization)
  category TEXT, -- 'segment' | 'campaign' | 'lifecycle' | 'behavior' | 'source'

  -- External CRM mappings
  crm_tag_mappings JSONB DEFAULT '{}'::JSONB,
  /* Example:
  {
    "hubspot": {"type": "list", "id": "123"},
    "gohighlevel": {"type": "tag", "id": "hot-lead"},
    "activecampaign": {"type": "tag", "id": "456"}
  }
  */

  -- Metadata
  is_system BOOLEAN DEFAULT FALSE, -- System tags can't be deleted

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contact_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,

  -- Metadata
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  applied_by TEXT, -- 'user' | 'automation' | 'crm_sync' | 'api'

  UNIQUE(contact_id, tag_id)
);

CREATE INDEX idx_contact_tags_contact_id ON contact_tags(contact_id);
CREATE INDEX idx_contact_tags_tag_id ON contact_tags(tag_id);
```

---

### 4. Events (Generic Event System)

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  /* 'webinar' | 'workshop' | 'consultation' | 'course' | 'masterclass' |
     'challenge' | 'networking' | 'conference' | 'one_on_one' | 'group_call' */

  -- Platform integration (abstracted)
  platform TEXT NOT NULL,
  /* 'zoom' | 'zoom_meeting' | 'zoom_webinar' | 'google_meet' | 'calendly' |
     'teams' | 'whereby' | 'in_person' | 'virtual_custom' */

  platform_event_id TEXT, -- External ID (e.g., Zoom webinar ID)
  platform_url TEXT, -- Link to platform event
  platform_metadata JSONB, -- Platform-specific data
  /* Example for Zoom:
  {
    "webinar_id": "123456789",
    "registration_url": "...",
    "host_id": "...",
    "settings": {...}
  }
  */

  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  duration_minutes INTEGER DEFAULT 60,
  ends_at TIMESTAMPTZ GENERATED ALWAYS AS (scheduled_at + (duration_minutes || ' minutes')::INTERVAL) STORED,

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
    "speaker": {"name": "...", "bio": "...", "photo": "..."},
    "agenda": [...]
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_platform ON events(platform);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_scheduled_at ON events(scheduled_at);
CREATE INDEX idx_events_platform_event_id ON events(platform_event_id);
CREATE UNIQUE INDEX idx_events_platform_unique ON events(platform, platform_event_id) WHERE platform_event_id IS NOT NULL;
```

---

### 5. Registrations (Generic Event Registration)

```sql
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

  -- Status
  status TEXT DEFAULT 'registered',
  /* registered | confirmed | waitlisted | attended | no_show | cancelled */

  -- Source tracking
  registration_source TEXT,
  /* 'landing_page' | 'email_link' | 'api' | 'manual' | 'crm_sync' */
  source_url TEXT,
  utm_params JSONB, -- UTM tracking

  -- Registration form data
  form_data JSONB DEFAULT '{}'::JSONB,
  /* Capture any additional fields from registration form */

  -- Reminders sent tracking
  reminders_sent JSONB DEFAULT '[]'::JSONB,
  /* Track which reminders were sent:
  [
    {"type": "24h", "sent_at": "...", "channel": "email"},
    {"type": "1h", "sent_at": "...", "channel": "sms"}
  ]
  */

  -- Timestamps
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(contact_id, event_id)
);

CREATE INDEX idx_registrations_contact_id ON registrations(contact_id);
CREATE INDEX idx_registrations_event_id ON registrations(event_id);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_registrations_attended ON registrations(attended);
CREATE INDEX idx_registrations_platform_registrant_id ON registrations(platform_registrant_id);
```

---

### 6. Activities (Universal Activity Log - HubSpot-style)

```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,

  -- Activity details
  activity_type TEXT NOT NULL,
  /* Standard types:
     'email_sent' | 'email_opened' | 'email_clicked' | 'email_bounced' |
     'sms_sent' | 'sms_delivered' | 'sms_clicked' |
     'page_viewed' | 'form_submitted' | 'file_downloaded' |
     'event_registered' | 'event_attended' | 'event_no_show' |
     'call_completed' | 'meeting_scheduled' |
     'property_changed' | 'tag_added' | 'tag_removed' |
     'lifecycle_stage_changed' | 'deal_created' | 'note_added'
  */

  -- Activity metadata
  activity_data JSONB NOT NULL,
  /* Flexible structure based on activity_type:
  For email_opened: {"message_id": "...", "subject": "...", "campaign_id": "..."}
  For page_viewed: {"url": "...", "title": "...", "duration_seconds": 45}
  For event_registered: {"event_id": "...", "event_title": "..."}
  */

  -- Related entities (polymorphic)
  related_to_type TEXT, -- 'registration' | 'message' | 'event' | 'campaign' | etc.
  related_to_id UUID,

  -- Source/attribution
  source TEXT, -- 'automation' | 'manual' | 'crm_sync' | 'webhook' | 'api'

  -- CRM sync
  synced_to_crms JSONB DEFAULT '[]'::JSONB,
  /* Track which CRMs this activity was synced to:
  [
    {"provider": "hubspot", "activity_id": "123", "synced_at": "..."},
    {"provider": "gohighlevel", "activity_id": "xyz", "synced_at": "..."}
  ]
  */

  -- Timestamps
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_contact_id ON activities(contact_id);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_occurred_at ON activities(occurred_at);
CREATE INDEX idx_activities_related_to ON activities(related_to_type, related_to_id);
CREATE INDEX idx_activities_data ON activities USING GIN(activity_data);
```

---

### 7. Integrations (External System Configs)

```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Provider details
  provider TEXT UNIQUE NOT NULL,
  /* 'hubspot' | 'gohighlevel' | 'salesforce' | 'activecampaign' |
     'mailchimp' | 'zoom' | 'calendly' | 'stripe' | 'google_calendar' */

  display_name TEXT NOT NULL,
  description TEXT,
  provider_type TEXT NOT NULL,
  /* 'crm' | 'email_provider' | 'sms_provider' | 'event_platform' |
     'payment' | 'calendar' | 'analytics' */

  -- Authentication
  auth_type TEXT NOT NULL,
  /* 'api_key' | 'oauth2' | 'oauth1' | 'basic_auth' | 'jwt' | 'server_to_server' */

  credentials JSONB NOT NULL,
  /* Encrypted credentials (structure varies by provider):
  For API key: {"api_key": "encrypted_key"}
  For OAuth2: {"access_token": "...", "refresh_token": "...", "expires_at": "..."}
  For HubSpot: {"access_token": "...", "refresh_token": "...", "portal_id": "..."}
  For Zoom: {"account_id": "...", "client_id": "...", "client_secret": "..."}
  */

  -- Configuration
  config JSONB DEFAULT '{}'::JSONB,
  /* Provider-specific settings:
  For CRM: {
    "sync_direction": "bidirectional",
    "sync_frequency": "realtime",
    "field_mappings": {...},
    "object_mappings": {"contacts": "contacts", "events": "deals"},
    "sync_tags": true,
    "sync_activities": true
  }
  For Email: {
    "from_email": "events@ceremonia.com",
    "from_name": "Ceremonia Events",
    "track_opens": true,
    "track_clicks": true
  }
  */

  -- Field mappings (CRM-specific)
  field_mappings JSONB DEFAULT '{}'::JSONB,
  /* Map our fields to provider fields:
  {
    "first_name": {"hubspot": "firstname", "gohighlevel": "first_name"},
    "last_name": {"hubspot": "lastname", "gohighlevel": "last_name"},
    "company": {"hubspot": "company", "gohighlevel": "custom_company"},
    "lead_score": {"hubspot": "hs_lead_score", "gohighlevel": "score"}
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
    "real_time": true
  }
  */

  -- Status
  status TEXT DEFAULT 'active',
  /* active | paused | error | disconnected */

  last_sync_at TIMESTAMPTZ,
  last_error TEXT,

  -- Webhooks
  webhook_url TEXT, -- URL to receive webhooks from provider
  webhook_secret TEXT, -- For signature verification

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_integrations_provider ON integrations(provider);
CREATE INDEX idx_integrations_type ON integrations(provider_type);
CREATE INDEX idx_integrations_status ON integrations(status);
```

---

### 8. CRM Sync Logs (Audit Trail)

```sql
CREATE TABLE crm_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Integration reference
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL, -- Denormalized for easier querying

  -- Sync details
  sync_type TEXT NOT NULL,
  /* 'contact_create' | 'contact_update' | 'contact_delete' |
     'activity_create' | 'tag_sync' | 'property_sync' |
     'bulk_import' | 'webhook_received' */

  sync_direction TEXT NOT NULL,
  /* 'push' | 'pull' | 'bidirectional' */

  -- Entity reference
  entity_type TEXT NOT NULL, -- 'contact' | 'activity' | 'tag' | 'property'
  entity_id UUID, -- Our internal ID
  external_id TEXT, -- CRM's ID

  -- Sync result
  status TEXT NOT NULL,
  /* 'success' | 'failed' | 'partial' | 'skipped' */

  -- Data payload
  payload JSONB, -- What was sent/received
  response JSONB, -- Provider response

  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  error_details JSONB,

  -- Performance
  duration_ms INTEGER,

  -- Timestamps
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_sync_logs_integration_id ON crm_sync_logs(integration_id);
CREATE INDEX idx_crm_sync_logs_provider ON crm_sync_logs(provider);
CREATE INDEX idx_crm_sync_logs_type ON crm_sync_logs(sync_type);
CREATE INDEX idx_crm_sync_logs_status ON crm_sync_logs(status);
CREATE INDEX idx_crm_sync_logs_entity ON crm_sync_logs(entity_type, entity_id);
CREATE INDEX idx_crm_sync_logs_synced_at ON crm_sync_logs(synced_at);
```

---

### 9. Campaigns (Unchanged - Already Abstract)

```sql
-- Keep existing campaigns table structure
-- It's already platform-agnostic and flexible
```

---

### 10. Message Templates (Enhanced for Multi-Channel)

```sql
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Channel and format
  channel TEXT NOT NULL,
  /* 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app' | 'voice' */

  -- For email
  subject_template TEXT,
  preheader_template TEXT,

  -- Content
  content_source TEXT DEFAULT 'external_api',
  /* 'external_api' | 'cached' | 'manual' | 'ai_generated' */

  content_api_url TEXT,
  cached_content_html TEXT,
  cached_content_text TEXT,

  -- Variables
  variables JSONB,
  required_variables JSONB, -- Variables that MUST be provided

  -- AI generation
  generation_prompt TEXT,
  brand_context JSONB,

  -- A/B testing
  is_variant BOOLEAN DEFAULT FALSE,
  parent_template_id UUID REFERENCES message_templates(id),
  variant_name TEXT, -- 'A', 'B', 'C'

  -- CRM integration
  sync_to_crm BOOLEAN DEFAULT FALSE,
  crm_template_mappings JSONB,
  /* Map to CRM email templates:
  {
    "hubspot": {"template_id": "123"},
    "gohighlevel": {"template_id": "abc"}
  }
  */

  -- Version control
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 11. Sent Messages (Enhanced)

```sql
CREATE TABLE sent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,

  -- Message details
  channel TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_message_id TEXT,

  -- Content (what was actually sent)
  subject TEXT,
  body_html TEXT,
  body_text TEXT,

  -- Recipient
  recipient_email TEXT,
  recipient_phone TEXT,

  -- Delivery tracking
  status TEXT DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,

  -- Engagement
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  links_clicked JSONB DEFAULT '[]'::JSONB,

  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  bounce_type TEXT,

  -- CRM sync
  synced_to_crms JSONB DEFAULT '[]'::JSONB,
  /* Track if/when synced to CRMs as activities:
  [
    {"provider": "hubspot", "activity_id": "123", "synced_at": "..."}
  ]
  */

  -- Provider metadata
  provider_metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sent_messages_contact_id ON sent_messages(contact_id);
CREATE INDEX idx_sent_messages_registration_id ON sent_messages(registration_id);
CREATE INDEX idx_sent_messages_status ON sent_messages(status);
CREATE INDEX idx_sent_messages_provider_message_id ON sent_messages(provider_message_id);
CREATE INDEX idx_sent_messages_sent_at ON sent_messages(sent_at);
```

---

## Key Design Principles

### 1. **CRM-First Thinking**
- Follows HubSpot/Salesforce data models (contacts, properties, activities, tags)
- Every entity can map to external CRM objects
- Sync logs provide full audit trail

### 2. **Platform Abstraction**
- Events work with any platform (Zoom, Calendly, Google Meet, etc.)
- Platform-specific data in JSONB (flexible, no schema changes)
- Platform type + ID creates unique external reference

### 3. **Flexible Property System**
- Custom fields stored as key/value pairs (like HubSpot)
- Field mappings allow syncing to different CRM field names
- Supports any data type (string, number, date, boolean)

### 4. **Universal Activity Log**
- Every interaction tracked (emails, page views, registrations, etc.)
- Activities can sync to CRMs as timeline events
- Enables advanced analytics and lead scoring

### 5. **Multi-CRM Support**
- Contacts can sync to multiple CRMs simultaneously
- Each integration has its own config and field mappings
- Sync logs track all operations for debugging

### 6. **Tagging System**
- Flexible categorization (segments, campaigns, behaviors)
- Tags map to CRM lists/tags/segments
- Automated tag application via campaigns

---

## Migration Strategy

### Phase 1: Core CRM (Week 1)
- contacts, contact_properties, tags, contact_tags
- activities (basic types)

### Phase 2: Events System (Week 1)
- events, registrations
- Migrate from webinar-specific to generic

### Phase 3: Integrations (Week 2)
- integrations, crm_sync_logs
- Start with Zoom integration

### Phase 4: CRM Sync (Week 3-4)
- HubSpot integration
- GoHighLevel integration
- Bidirectional sync

---

## API Examples

### Create Contact with HubSpot Sync

```typescript
POST /api/contacts
{
  "email": "user@example.com",
  "firstName": "Austin",
  "lastName": "Mao",
  "properties": {
    "company": "Ceremonia",
    "job_title": "Founder",
    "industry": "SaaS"
  },
  "tags": ["webinar-attendee", "hot-lead"],
  "syncToCrms": ["hubspot", "gohighlevel"]
}
```

### Register for Event

```typescript
POST /api/registrations
{
  "email": "user@example.com",
  "eventId": "uuid",
  "formData": {
    "company": "Acme Corp",
    "attendee_role": "Marketing Manager"
  },
  "utmParams": {
    "source": "linkedin",
    "campaign": "webinar-2025-Q4"
  }
}
```

### Track Activity

```typescript
POST /api/activities
{
  "contactId": "uuid",
  "activityType": "page_viewed",
  "activityData": {
    "url": "/landing/webinar",
    "title": "How to Build AI Funnels",
    "durationSeconds": 45
  },
  "syncToCrms": ["hubspot"]
}
```

---

## Next Steps

Would you like me to:
1. **Generate the full SQL migration** with this new schema?
2. **Create API endpoint specs** for the new structure?
3. **Design the HubSpot/GoHighLevel sync architecture**?
4. **Show data flow examples** for common use cases?
