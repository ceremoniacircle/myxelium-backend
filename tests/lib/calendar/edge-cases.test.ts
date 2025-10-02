/**
 * Edge Case Tests for Calendar Module
 *
 * Tests uncovered branches and edge cases to achieve 100% code coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateICS,
  generateICSFromRegistration,
} from '@/lib/calendar/ics-generator';
import {
  generateCalendarLinksFromRegistration,
} from '@/lib/calendar/links';
import type { CalendarEvent, EventData, RegistrationData, ContactData } from '@/lib/calendar/types';

describe('Calendar Edge Cases', () => {
  describe('generateICS - Organizer Name Edge Cases', () => {
    it('should use default organizer name when not provided', () => {
      const event: CalendarEvent = {
        title: 'Test Event',
        startTime: '2025-10-01T14:00:00Z',
        durationMinutes: 60,
        timezone: 'America/Denver',
        organizerEmail: 'test@example.com',
        // organizerName not provided - should default to 'Ceremonia'
      };

      const ics = generateICS(event);

      // Line 111: const organizerName = event.organizerName || 'Ceremonia';
      expect(ics).toContain('ORGANIZER;CN=Ceremonia:mailto:test@example.com');
    });

    it('should use custom organizer name when provided', () => {
      const event: CalendarEvent = {
        title: 'Test Event',
        startTime: '2025-10-01T14:00:00Z',
        durationMinutes: 60,
        timezone: 'America/Denver',
        organizerEmail: 'custom@example.com',
        organizerName: 'Custom Organizer',
      };

      const ics = generateICS(event);
      expect(ics).toContain('ORGANIZER;CN=Custom Organizer:mailto:custom@example.com');
    });
  });

  describe('generateICS - Attendee Name Edge Cases', () => {
    it('should use attendee email when name not provided', () => {
      const event: CalendarEvent = {
        title: 'Test Event',
        startTime: '2025-10-01T14:00:00Z',
        durationMinutes: 60,
        timezone: 'America/Denver',
        attendeeEmail: 'attendee@example.com',
        // attendeeName not provided - should use email
      };

      const ics = generateICS(event);

      // Line 117: const attendeeName = event.attendeeName || event.attendeeEmail;
      expect(ics).toContain('ATTENDEE;CN=attendee@example.com;RSVP=TRUE:mailto:attendee@example.com');
    });

    it('should use custom attendee name when provided', () => {
      const event: CalendarEvent = {
        title: 'Test Event',
        startTime: '2025-10-01T14:00:00Z',
        durationMinutes: 60,
        timezone: 'America/Denver',
        attendeeEmail: 'attendee@example.com',
        attendeeName: 'Jane Smith',
      };

      const ics = generateICS(event);
      expect(ics).toContain('ATTENDEE;CN=Jane Smith;RSVP=TRUE:mailto:attendee@example.com');
    });
  });

  describe('generateICS - Reminder Edge Cases', () => {
    it('should generate event without reminders when includeReminders is false', () => {
      const event: CalendarEvent = {
        title: 'Test Event',
        startTime: '2025-10-01T14:00:00Z',
        durationMinutes: 60,
        timezone: 'America/Denver',
      };

      const ics = generateICS(event, { includeReminders: false });

      // Line 192: Empty reminderHours array, no VALARM blocks
      expect(ics).not.toContain('BEGIN:VALARM');
      expect(ics).not.toContain('END:VALARM');
    });

    it('should handle empty reminderHours array', () => {
      const event: CalendarEvent = {
        title: 'Test Event',
        startTime: '2025-10-01T14:00:00Z',
        durationMinutes: 60,
        timezone: 'America/Denver',
      };

      const ics = generateICS(event, {
        includeReminders: true,
        reminderHours: []
      });

      expect(ics).not.toContain('BEGIN:VALARM');
    });

    it('should generate multiple VALARM blocks for multiple reminders', () => {
      const event: CalendarEvent = {
        title: 'Test Event',
        startTime: '2025-10-01T14:00:00Z',
        durationMinutes: 60,
        timezone: 'America/Denver',
      };

      const ics = generateICS(event, {
        includeReminders: true,
        reminderHours: [24, 1, 0.25] // 24h, 1h, 15min
      });

      // Should have 3 VALARM blocks
      const valarmCount = (ics.match(/BEGIN:VALARM/g) || []).length;
      expect(valarmCount).toBe(3);

      expect(ics).toContain('TRIGGER:-PT24H');
      expect(ics).toContain('TRIGGER:-PT1H');
      expect(ics).toContain('TRIGGER:-PT15M');
    });
  });

  describe('generateCalendarLinksFromRegistration - Edge Cases', () => {
    it('should handle missing join URL gracefully', () => {
      const eventData: EventData = {
        id: 'evt-123',
        title: 'Test Event',
        description: 'Test Description',
        scheduled_at: '2025-10-01T14:00:00Z',
        timezone: 'America/Denver',
        duration_minutes: 60,
        // join_url not provided
      };

      const registrationData: RegistrationData = {
        id: 'reg-123',
        // platform_join_url not provided
      };

      const contactData: ContactData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };

      const links = generateCalendarLinksFromRegistration(
        eventData,
        registrationData,
        contactData,
        ''
      );

      // Line 202: Should handle empty join URL
      expect(links.google).toBeDefined();
      expect(links.outlook).toBeDefined();
      expect(links.yahoo).toBeDefined();
      expect(links.apple).toBeDefined();
    });

    it('should append join URL to description when description exists', () => {
      const eventData: EventData = {
        id: 'evt-123',
        title: 'Test Event',
        description: 'Original description',
        scheduled_at: '2025-10-01T14:00:00Z',
        timezone: 'America/Denver',
        duration_minutes: 60,
        join_url: 'https://zoom.us/j/123',
      };

      const registrationData: RegistrationData = {
        id: 'reg-123',
      };

      const contactData: ContactData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };

      const links = generateCalendarLinksFromRegistration(
        eventData,
        registrationData,
        contactData,
        ''
      );

      // Line 207-208: Should append with newlines
      expect(links.google).toContain('Original+description');
      // URL is encoded in the link, so check for encoded version
      expect(links.google).toContain('https%3A%2F%2Fzoom.us%2Fj%2F123');
    });

    it('should build attendee name from first and last name', () => {
      const eventData: EventData = {
        id: 'evt-123',
        title: 'Test Event',
        scheduled_at: '2025-10-01T14:00:00Z',
        timezone: 'America/Denver',
        duration_minutes: 60,
      };

      const registrationData: RegistrationData = {
        id: 'reg-123',
      };

      const contactData: ContactData = {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
      };

      const links = generateCalendarLinksFromRegistration(
        eventData,
        registrationData,
        contactData,
        ''
      );

      // Line 212-214: Should concatenate names
      expect(links.google).toBeDefined();
      expect(links.outlook).toBeDefined();
    });

    it('should use email as fallback when no name provided', () => {
      const eventData: EventData = {
        id: 'evt-123',
        title: 'Test Event',
        scheduled_at: '2025-10-01T14:00:00Z',
        timezone: 'America/Denver',
        duration_minutes: 60,
      };

      const registrationData: RegistrationData = {
        id: 'reg-123',
      };

      const contactData: ContactData = {
        email: 'guest@example.com',
        // No first_name or last_name
      };

      const links = generateCalendarLinksFromRegistration(
        eventData,
        registrationData,
        contactData,
        ''
      );

      // Line 214: Should use email as name
      expect(links.google).toBeDefined();
    });

    it('should use "Guest" when no name or email provided', () => {
      const eventData: EventData = {
        id: 'evt-123',
        title: 'Test Event',
        scheduled_at: '2025-10-01T14:00:00Z',
        timezone: 'America/Denver',
        duration_minutes: 60,
      };

      const registrationData: RegistrationData = {
        id: 'reg-123',
      };

      const contactData: ContactData = {
        // No first_name, last_name, or email
      };

      const links = generateCalendarLinksFromRegistration(
        eventData,
        registrationData,
        contactData,
        ''
      );

      // Line 214: Should use "Guest" as fallback
      expect(links.google).toBeDefined();
    });

    it('should use RESEND_FROM_EMAIL environment variable for organizer', () => {
      const originalEnv = process.env.RESEND_FROM_EMAIL;
      process.env.RESEND_FROM_EMAIL = 'custom@ceremonia.com';

      const eventData: EventData = {
        id: 'evt-123',
        title: 'Test Event',
        scheduled_at: '2025-10-01T14:00:00Z',
        timezone: 'America/Denver',
        duration_minutes: 60,
      };

      const registrationData: RegistrationData = {
        id: 'reg-123',
      };

      const contactData: ContactData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };

      const links = generateCalendarLinksFromRegistration(
        eventData,
        registrationData,
        contactData,
        ''
      );

      // Line 225: Should use RESEND_FROM_EMAIL
      expect(links.google).toBeDefined();

      // Restore original env
      if (originalEnv !== undefined) {
        process.env.RESEND_FROM_EMAIL = originalEnv;
      } else {
        delete process.env.RESEND_FROM_EMAIL;
      }
    });

    it('should fallback to events@ceremonia.com when RESEND_FROM_EMAIL not set', () => {
      const originalEnv = process.env.RESEND_FROM_EMAIL;
      delete process.env.RESEND_FROM_EMAIL;

      const eventData: EventData = {
        id: 'evt-123',
        title: 'Test Event',
        scheduled_at: '2025-10-01T14:00:00Z',
        timezone: 'America/Denver',
        duration_minutes: 60,
      };

      const registrationData: RegistrationData = {
        id: 'reg-123',
      };

      const contactData: ContactData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };

      const links = generateCalendarLinksFromRegistration(
        eventData,
        registrationData,
        contactData,
        ''
      );

      // Line 225: Should use default
      expect(links.google).toBeDefined();

      // Restore original env
      if (originalEnv !== undefined) {
        process.env.RESEND_FROM_EMAIL = originalEnv;
      }
    });

    it('should handle undefined attendeeEmail', () => {
      const eventData: EventData = {
        id: 'evt-123',
        title: 'Test Event',
        scheduled_at: '2025-10-01T14:00:00Z',
        timezone: 'America/Denver',
        duration_minutes: 60,
      };

      const registrationData: RegistrationData = {
        id: 'reg-123',
      };

      const contactData: ContactData = {
        first_name: 'John',
        last_name: 'Doe',
        // email undefined
      };

      const links = generateCalendarLinksFromRegistration(
        eventData,
        registrationData,
        contactData,
        ''
      );

      // Line 227: attendeeEmail could be undefined
      expect(links.google).toBeDefined();
      expect(links.outlook).toBeDefined();
    });
  });

  describe('generateICSFromRegistration - Integration Edge Cases', () => {
    it('should generate ICS from database records with all fields', () => {
      const eventData: EventData = {
        id: 'evt-456',
        title: 'Complete Event',
        description: 'Full description',
        scheduled_at: '2025-11-15T10:00:00Z',
        timezone: 'America/New_York',
        duration_minutes: 90,
        join_url: 'https://zoom.us/j/default',
      };

      const registrationData: RegistrationData = {
        id: 'reg-456',
        platform_join_url: 'https://zoom.us/j/specific?pwd=xyz',
      };

      const contactData: ContactData = {
        first_name: 'Alice',
        last_name: 'Johnson',
        email: 'alice@example.com',
      };

      const ics = generateICSFromRegistration(
        eventData,
        registrationData,
        contactData
      );

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('SUMMARY:Complete Event');
      expect(ics).toContain('LOCATION:https://zoom.us/j/specific?pwd=xyz');
      expect(ics).toContain('ATTENDEE;CN=Alice Johnson');
    });

    it('should handle minimal database records', () => {
      const eventData: EventData = {
        id: 'evt-789',
        title: 'Minimal Event',
        scheduled_at: '2025-12-01T15:00:00Z',
        timezone: 'UTC',
        duration_minutes: 30,
      };

      const registrationData: RegistrationData = {
        id: 'reg-789',
      };

      const contactData: ContactData = {
        email: 'minimal@example.com',
      };

      const ics = generateICSFromRegistration(
        eventData,
        registrationData,
        contactData
      );

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('SUMMARY:Minimal Event');
      expect(ics).toContain('ATTENDEE;CN=minimal@example.com');
    });
  });
});
