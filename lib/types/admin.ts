/**
 * Admin API Types
 */

// Events
export interface AdminEventListItem {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  timezone: string;
  duration_minutes: number;
  platform: string;
  status: string;
  enrollment_count: number;
  attendance_count: number;
  attendance_rate: number;
  created_at: string;
}

export interface AdminEventStats {
  total_registrations: number;
  attended: number;
  no_show: number;
  attendance_rate: number;
  avg_attendance_duration: number;
  messages_sent: number;
  emails_sent: number;
  sms_sent: number;
  email_open_rate: number;
  email_click_rate: number;
}

export interface AdminEventRegistration {
  id: string;
  contact_id: string;
  contact_email: string;
  contact_name: string;
  registered_at: string;
  attended: boolean | null;
  attended_at: string | null;
  attendance_duration_minutes: number | null;
  status: string;
}

export interface AdminEventDetails {
  event: {
    id: string;
    title: string;
    description: string | null;
    scheduled_at: string;
    timezone: string;
    duration_minutes: number;
    platform: string;
    platform_event_id: string | null;
    join_url: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  };
  stats: AdminEventStats;
  recent_registrations: AdminEventRegistration[];
}

// Contacts
export interface AdminContactListItem {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  consent_email: boolean;
  consent_sms: boolean;
  consent_marketing: boolean;
  timezone: string | null;
  total_events: number;
  total_messages: number;
  created_at: string;
}

export interface AdminContactStats {
  total_events: number;
  events_attended: number;
  events_no_show: number;
  attendance_rate: number;
  total_messages: number;
  emails_received: number;
  sms_received: number;
  email_open_rate: number;
}

export interface AdminContactEvent {
  id: string;
  title: string;
  scheduled_at: string;
  registered_at: string;
  attended: boolean | null;
  attendance_duration_minutes: number | null;
}

export interface AdminContactMessage {
  id: string;
  channel: string;
  subject: string | null;
  sent_at: string | null;
  status: string;
  opened_at: string | null;
  clicked_at: string | null;
}

export interface AdminContactActivity {
  id: string;
  activity_type: string;
  activity_data: any;
  occurred_at: string;
  source: string;
}

export interface AdminContactDetails {
  contact: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    consent_email: boolean;
    consent_sms: boolean;
    consent_marketing: boolean;
    timezone: string | null;
    created_at: string;
    updated_at: string;
  };
  stats: AdminContactStats;
  recent_events: AdminContactEvent[];
  recent_messages: AdminContactMessage[];
  recent_activities: AdminContactActivity[];
}

// Messages
export interface AdminMessageListItem {
  id: string;
  contact_email: string;
  contact_name: string;
  channel: string;
  subject: string | null;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  error_message: string | null;
  event_title: string | null;
}

export interface AdminSendMessageRequest {
  contact_id: string;
  channel: 'email' | 'sms';
  subject?: string;
  content: string;
  template_id?: string;
}

export interface AdminSendMessageResponse {
  success: boolean;
  message_id: string;
  provider_message_id?: string;
  status: string;
}

// Analytics
export interface AdminAnalyticsOverview {
  period: {
    start: string;
    end: string;
  };
  events: {
    total: number;
    upcoming: number;
    completed: number;
    cancelled: number;
  };
  contacts: {
    total: number;
    new_this_period: number;
    active_this_period: number;
  };
  registrations: {
    total: number;
    total_attended: number;
    total_no_show: number;
    avg_attendance_rate: number;
  };
  messages: {
    total: number;
    email: number;
    sms: number;
    delivered: number;
    failed: number;
    delivery_rate: number;
  };
  engagement: {
    email_open_rate: number;
    email_click_rate: number;
    avg_email_opens_per_contact: number;
  };
}

export interface AdminEventAnalyticsTimelineStep {
  step: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
}

export interface AdminEventAnalytics {
  event: {
    id: string;
    title: string;
    scheduled_at: string;
  };
  funnel_metrics: {
    registrations: number;
    welcome_emails_sent: number;
    welcome_email_open_rate: number;
    reminder_24h_sent: number;
    reminder_1h_sent: number;
    attended: number;
    no_show: number;
    attendance_rate: number;
    post_event_emails_sent: number;
  };
  timeline: AdminEventAnalyticsTimelineStep[];
}

// Webhooks
export interface AdminWebhookListItem {
  id: string;
  provider: string;
  event_type: string;
  signature_valid: boolean | null;
  processed: boolean;
  processed_at: string | null;
  registration_id: string | null;
  processing_error: string | null;
  created_at: string;
}

// Common list response
export interface AdminListResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// Error response
export interface AdminErrorResponse {
  error: string;
  details?: any;
}
