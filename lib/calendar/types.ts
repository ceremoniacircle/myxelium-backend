/**
 * Calendar Integration Types
 *
 * TypeScript interfaces for calendar event generation and add-to-calendar links
 */

/**
 * Calendar event data structure
 */
export interface CalendarEvent {
  /** Event title/summary */
  title: string;
  /** Event description (optional) */
  description?: string;
  /** Event location (Zoom URL, etc.) */
  location?: string;
  /** Event start time (ISO 8601 format) */
  startTime: string;
  /** Event duration in minutes */
  durationMinutes: number;
  /** IANA timezone (e.g., 'America/Denver') */
  timezone: string;
  /** Event organizer name */
  organizerName?: string;
  /** Event organizer email */
  organizerEmail?: string;
  /** Attendee name */
  attendeeName?: string;
  /** Attendee email */
  attendeeEmail?: string;
}

/**
 * Options for ICS file generation
 */
export interface ICSOptions {
  /** Product identifier (default: '-//Ceremonia//Myxelium//EN') */
  prodId?: string;
  /** Include reminders (default: true) */
  includeReminders?: boolean;
  /** Reminder times in hours before event (default: [24, 1]) */
  reminderHours?: number[];
  /** Event status (default: 'CONFIRMED') */
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  /** Sequence number for updates (default: 0) */
  sequence?: number;
}

/**
 * Calendar provider types
 */
export type CalendarProvider = 'google' | 'outlook' | 'apple' | 'yahoo';

/**
 * Add-to-calendar link data
 */
export interface CalendarLinks {
  google: string;
  outlook: string;
  apple: string;
  yahoo: string;
}

/**
 * Registration data for calendar generation
 */
export interface RegistrationData {
  /** Unique registration ID */
  id: string;
  /** Platform join URL (Zoom, etc.) */
  platform_join_url?: string | null;
}

/**
 * Event data for calendar generation
 */
export interface EventData {
  /** Event ID */
  id: string;
  /** Event title */
  title: string;
  /** Event description */
  description?: string | null;
  /** Event start time (ISO 8601) */
  scheduled_at: string;
  /** Event timezone (IANA) */
  timezone: string;
  /** Event duration in minutes */
  duration_minutes: number;
  /** Platform join URL */
  join_url?: string | null;
}

/**
 * Contact data for calendar generation
 */
export interface ContactData {
  /** Contact first name */
  first_name?: string | null;
  /** Contact last name */
  last_name?: string | null;
  /** Contact email */
  email?: string | null;
}
