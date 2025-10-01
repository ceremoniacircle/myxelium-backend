/**
 * Inngest Client Configuration
 *
 * Initializes the Inngest client for serverless function orchestration.
 * Used for event-driven drip campaigns and job queue management.
 */

import { Inngest } from 'inngest';

// Initialize Inngest client with event key
export const inngest = new Inngest({
  id: 'myxelium',
  name: 'Myxelium Event Funnel Orchestration',
  eventKey: process.env.INNGEST_EVENT_KEY,
});

/**
 * Event type definitions for type-safe event sending
 */
export type InngestEvents = {
  'event.enrolled': {
    data: {
      contactId: string;
      eventId: string;
      registrationId: string;
      eventTitle: string;
      scheduledAt: string; // ISO 8601 timestamp
      contactEmail: string;
      contactFirstName?: string;
      contactLastName?: string;
      contactPhone?: string;
      joinUrl?: string;
    };
  };
  'event.completed': {
    data: {
      eventId: string;
      eventTitle: string;
      completedAt: string; // ISO 8601 timestamp
    };
  };
  'event.cancelled': {
    data: {
      eventId: string;
      eventTitle: string;
      cancelledAt: string; // ISO 8601 timestamp
    };
  };
  'registration.attended': {
    data: {
      registrationId: string;
      contactId: string;
      eventId: string;
      attendedAt: string; // ISO 8601 timestamp
      attendanceDurationMinutes?: number;
    };
  };
  'registration.no_show': {
    data: {
      registrationId: string;
      contactId: string;
      eventId: string;
      eventScheduledAt: string; // ISO 8601 timestamp
    };
  };
};
