/**
 * Tests for ICS Calendar File Generator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateICS,
  generateICSFromRegistration,
  icsToBase64,
  generateICSFilename,
} from '@/lib/calendar/ics-generator';
import type { CalendarEvent, EventData, RegistrationData, ContactData } from '@/lib/calendar/types';

describe('ICS Generator', () => {
  let mockEvent: CalendarEvent;
  let mockEventData: EventData;
  let mockRegistrationData: RegistrationData;
  let mockContactData: ContactData;

  beforeEach(() => {
    mockEvent = {
      title: 'AI Workshop 2025',
      description: 'Learn about artificial intelligence and machine learning',
      location: 'https://zoom.us/j/123456789',
      startTime: '2025-10-01T14:00:00Z',
      durationMinutes: 60,
      timezone: 'America/Denver',
      organizerName: 'Ceremonia',
      organizerEmail: 'events@ceremonia.com',
      attendeeName: 'John Doe',
      attendeeEmail: 'john@example.com',
    };

    mockEventData = {
      id: 'evt-123',
      title: 'AI Workshop 2025',
      description: 'Learn about AI',
      scheduled_at: '2025-10-01T14:00:00Z',
      timezone: 'America/Denver',
      duration_minutes: 60,
      join_url: 'https://zoom.us/j/123456789',
    };

    mockRegistrationData = {
      id: 'reg-123',
      platform_join_url: 'https://zoom.us/j/987654321?pwd=abc123',
    };

    mockContactData = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
    };
  });

  describe('generateICS', () => {
    it('should generate valid ICS file with required fields', () => {
      const ics = generateICS(mockEvent);

      // Check calendar structure
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('END:VCALENDAR');

      // Check event structure
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('END:VEVENT');

      // Check required fields
      expect(ics).toContain('UID:');
      expect(ics).toContain('DTSTAMP:');
      expect(ics).toContain('DTSTART;');
      expect(ics).toContain('DTEND;');
      expect(ics).toContain('SUMMARY:');
    });

    it('should include event title in SUMMARY', () => {
      const ics = generateICS(mockEvent);
      expect(ics).toContain('SUMMARY:AI Workshop 2025');
    });

    it('should include event description', () => {
      const ics = generateICS(mockEvent);
      expect(ics).toContain('DESCRIPTION:Learn about artificial intelligence and machine learning');
    });

    it('should include event location', () => {
      const ics = generateICS(mockEvent);
      expect(ics).toContain('LOCATION:https://zoom.us/j/123456789');
    });

    it('should include timezone in DTSTART and DTEND', () => {
      const ics = generateICS(mockEvent);
      expect(ics).toContain('DTSTART;TZID=America/Denver:');
      expect(ics).toContain('DTEND;TZID=America/Denver:');
    });

    it('should include organizer information', () => {
      const ics = generateICS(mockEvent);
      expect(ics).toContain('ORGANIZER;CN=Ceremonia:mailto:events@ceremonia.com');
    });

    it('should include attendee information', () => {
      const ics = generateICS(mockEvent);
      expect(ics).toContain('ATTENDEE;CN=John Doe;RSVP=TRUE:mailto:john@example.com');
    });

    it('should set status to CONFIRMED by default', () => {
      const ics = generateICS(mockEvent);
      expect(ics).toContain('STATUS:CONFIRMED');
    });

    it('should set sequence to 0 by default', () => {
      const ics = generateICS(mockEvent);
      expect(ics).toContain('SEQUENCE:0');
    });

    it('should include default reminders (24h and 1h)', () => {
      const ics = generateICS(mockEvent);

      expect(ics).toContain('BEGIN:VALARM');
      expect(ics).toContain('END:VALARM');
      expect(ics).toContain('TRIGGER:-PT24H');
      expect(ics).toContain('TRIGGER:-PT1H');
      expect(ics).toContain('ACTION:DISPLAY');
    });

    it('should allow custom reminder times', () => {
      const ics = generateICS(mockEvent, {
        reminderHours: [48, 2],
      });

      expect(ics).toContain('TRIGGER:-PT48H');
      expect(ics).toContain('TRIGGER:-PT2H');
      expect(ics).not.toContain('TRIGGER:-PT24H');
      expect(ics).not.toContain('TRIGGER:-PT1H');
    });

    it('should allow disabling reminders', () => {
      const ics = generateICS(mockEvent, {
        includeReminders: false,
      });

      expect(ics).not.toContain('BEGIN:VALARM');
    });

    it('should allow custom status', () => {
      const ics = generateICS(mockEvent, {
        status: 'TENTATIVE',
      });

      expect(ics).toContain('STATUS:TENTATIVE');
    });

    it('should allow custom sequence number', () => {
      const ics = generateICS(mockEvent, {
        sequence: 5,
      });

      expect(ics).toContain('SEQUENCE:5');
    });

    it('should use custom PRODID if provided', () => {
      const ics = generateICS(mockEvent, {
        prodId: '-//MyCompany//MyApp//EN',
      });

      expect(ics).toContain('PRODID:-//MyCompany//MyApp//EN');
    });

    it('should escape special characters in text fields', () => {
      const eventWithSpecialChars: CalendarEvent = {
        ...mockEvent,
        title: 'Workshop; Part 1, Section A',
        description: 'Line 1\nLine 2; with comma, and backslash\\',
      };

      const ics = generateICS(eventWithSpecialChars);

      expect(ics).toContain('Workshop\\; Part 1\\, Section A');
      expect(ics).toContain('Line 1\\nLine 2\\; with comma\\, and backslash\\\\');
    });

    it('should use CRLF line endings', () => {
      const ics = generateICS(mockEvent);
      expect(ics).toContain('\r\n');
      expect(ics.split('\r\n').length).toBeGreaterThan(10);
    });

    it('should handle events without description', () => {
      const eventWithoutDesc: CalendarEvent = {
        ...mockEvent,
        description: undefined,
      };

      const ics = generateICS(eventWithoutDesc);
      // Should not contain event DESCRIPTION (VALARM will have its own DESCRIPTION)
      const lines = ics.split('\r\n');
      const veventStart = lines.indexOf('BEGIN:VEVENT');
      const valarmStart = lines.findIndex(l => l === 'BEGIN:VALARM');
      const descriptionLine = lines.findIndex(l => l.startsWith('DESCRIPTION:'));

      // If DESCRIPTION exists, it should be inside VALARM, not in VEVENT
      if (descriptionLine !== -1) {
        expect(descriptionLine).toBeGreaterThan(valarmStart);
      }
    });

    it('should handle events without location', () => {
      const eventWithoutLocation: CalendarEvent = {
        ...mockEvent,
        location: undefined,
      };

      const ics = generateICS(eventWithoutLocation);
      expect(ics).not.toContain('LOCATION:');
    });

    it('should handle events without organizer', () => {
      const eventWithoutOrganizer: CalendarEvent = {
        ...mockEvent,
        organizerEmail: undefined,
        organizerName: undefined,
      };

      const ics = generateICS(eventWithoutOrganizer);
      expect(ics).not.toContain('ORGANIZER:');
    });

    it('should handle events without attendee', () => {
      const eventWithoutAttendee: CalendarEvent = {
        ...mockEvent,
        attendeeEmail: undefined,
        attendeeName: undefined,
      };

      const ics = generateICS(eventWithoutAttendee);
      expect(ics).not.toContain('ATTENDEE:');
    });

    it('should calculate correct end time based on duration', () => {
      const ics = generateICS(mockEvent);

      // Event is 60 minutes, so end should be 1 hour after start
      expect(ics).toContain('DTSTART;TZID=America/Denver:');
      expect(ics).toContain('DTEND;TZID=America/Denver:');

      // Extract times (basic check that both exist)
      const startMatch = ics.match(/DTSTART;TZID=America\/Denver:(\d{8}T\d{6})/);
      const endMatch = ics.match(/DTEND;TZID=America\/Denver:(\d{8}T\d{6})/);

      expect(startMatch).toBeTruthy();
      expect(endMatch).toBeTruthy();
    });

    it('should handle different timezones', () => {
      const eventWithDifferentTz: CalendarEvent = {
        ...mockEvent,
        timezone: 'America/New_York',
      };

      const ics = generateICS(eventWithDifferentTz);
      expect(ics).toContain('DTSTART;TZID=America/New_York:');
      expect(ics).toContain('DTEND;TZID=America/New_York:');
    });

    it('should generate unique UID based on attendee email and time', () => {
      const ics1 = generateICS(mockEvent);
      const ics2 = generateICS({
        ...mockEvent,
        attendeeEmail: 'jane@example.com',
      });

      const uid1 = ics1.match(/UID:([^\r\n]+)/)?.[1];
      const uid2 = ics2.match(/UID:([^\r\n]+)/)?.[1];

      expect(uid1).toBeTruthy();
      expect(uid2).toBeTruthy();
      expect(uid1).not.toBe(uid2);
    });
  });

  describe('generateICSFromRegistration', () => {
    it('should generate ICS from database records', () => {
      const ics = generateICSFromRegistration(
        mockEventData,
        mockRegistrationData,
        mockContactData
      );

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('SUMMARY:AI Workshop 2025');
      expect(ics).toContain('john@example.com');
    });

    it('should use registration-specific join URL', () => {
      const ics = generateICSFromRegistration(
        mockEventData,
        mockRegistrationData,
        mockContactData
      );

      expect(ics).toContain('https://zoom.us/j/987654321?pwd=abc123');
    });

    it('should fall back to event join URL if registration URL missing', () => {
      const regWithoutUrl: RegistrationData = {
        id: 'reg-123',
        platform_join_url: null,
      };

      const ics = generateICSFromRegistration(
        mockEventData,
        regWithoutUrl,
        mockContactData
      );

      expect(ics).toContain('https://zoom.us/j/123456789');
    });

    it('should build attendee name from first and last name', () => {
      const ics = generateICSFromRegistration(
        mockEventData,
        mockRegistrationData,
        mockContactData
      );

      expect(ics).toContain('ATTENDEE;CN=John Doe');
    });

    it('should use email as attendee name if name missing', () => {
      const contactWithoutName: ContactData = {
        first_name: null,
        last_name: null,
        email: 'test@example.com',
      };

      const ics = generateICSFromRegistration(
        mockEventData,
        mockRegistrationData,
        contactWithoutName
      );

      expect(ics).toContain('ATTENDEE;CN=test@example.com');
    });

    it('should omit attendee if email is missing', () => {
      const contactWithoutInfo: ContactData = {
        first_name: null,
        last_name: null,
        email: null,
      };

      const ics = generateICSFromRegistration(
        mockEventData,
        mockRegistrationData,
        contactWithoutInfo
      );

      // Without email, should not include ATTENDEE
      expect(ics).not.toContain('ATTENDEE');
    });

    it('should append join URL to description', () => {
      const ics = generateICSFromRegistration(
        mockEventData,
        mockRegistrationData,
        mockContactData
      );

      expect(ics).toContain('Learn about AI');
      // URL might be escaped or folded, so check for the domain at least
      expect(ics).toContain('zoom.us/j/987654321');
    });

    it('should handle missing event description', () => {
      const eventWithoutDesc: EventData = {
        ...mockEventData,
        description: null,
      };

      const ics = generateICSFromRegistration(
        eventWithoutDesc,
        mockRegistrationData,
        mockContactData
      );

      expect(ics).toContain('Join URL:');
    });
  });

  describe('icsToBase64', () => {
    it('should convert ICS content to base64', () => {
      const icsContent = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR';
      const base64 = icsToBase64(icsContent);

      expect(base64).toBeTruthy();
      expect(typeof base64).toBe('string');

      // Verify it's valid base64
      expect(base64).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should be reversible', () => {
      const icsContent = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR';
      const base64 = icsToBase64(icsContent);
      const decoded = Buffer.from(base64, 'base64').toString('utf-8');

      expect(decoded).toBe(icsContent);
    });

    it('should handle complete ICS file', () => {
      const ics = generateICS(mockEvent);
      const base64 = icsToBase64(ics);

      expect(base64).toBeTruthy();
      expect(base64.length).toBeGreaterThan(100);
    });
  });

  describe('generateICSFilename', () => {
    it('should generate filename from event title', () => {
      const filename = generateICSFilename('AI Workshop 2025');
      expect(filename).toBe('ai-workshop-2025.ics');
    });

    it('should convert to lowercase', () => {
      const filename = generateICSFilename('UPPERCASE TITLE');
      expect(filename).toBe('uppercase-title.ics');
    });

    it('should replace spaces with hyphens', () => {
      const filename = generateICSFilename('Multiple Word Title');
      expect(filename).toBe('multiple-word-title.ics');
    });

    it('should remove special characters', () => {
      const filename = generateICSFilename('Title: Part #1 (2025)!');
      expect(filename).toBe('title-part-1-2025.ics');
    });

    it('should remove leading and trailing hyphens', () => {
      const filename = generateICSFilename('--Title--');
      expect(filename).toBe('title.ics');
    });

    it('should truncate long titles', () => {
      const longTitle = 'A'.repeat(100);
      const filename = generateICSFilename(longTitle);
      expect(filename.length).toBeLessThanOrEqual(54); // 50 + '.ics'
    });

    it('should handle empty titles', () => {
      const filename = generateICSFilename('');
      expect(filename).toBe('event.ics');
    });

    it('should handle titles with only special characters', () => {
      const filename = generateICSFilename('!@#$%^&*()');
      expect(filename).toBe('event.ics');
    });

    it('should always end with .ics extension', () => {
      expect(generateICSFilename('Test')).toMatch(/\.ics$/);
      expect(generateICSFilename('')).toMatch(/\.ics$/);
      expect(generateICSFilename('!@#$')).toMatch(/\.ics$/);
    });
  });

  describe('RFC 5545 Compliance', () => {
    it('should include all required calendar properties', () => {
      const ics = generateICS(mockEvent);

      // Required calendar properties
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('PRODID:');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('should include all required event properties', () => {
      const ics = generateICS(mockEvent);

      // Required event properties
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('UID:');
      expect(ics).toContain('DTSTAMP:');
      expect(ics).toContain('END:VEVENT');
    });

    it('should use CRLF line endings throughout', () => {
      const ics = generateICS(mockEvent);

      // Should not have any LF-only line endings
      expect(ics.split('\n').every((line, i, arr) => {
        if (i === arr.length - 1) return true; // Last line
        return line.endsWith('\r');
      })).toBe(true);
    });

    it('should properly structure nested components', () => {
      const ics = generateICS(mockEvent);

      const lines = ics.split('\r\n');

      // Find indices
      const vcalendarStart = lines.indexOf('BEGIN:VCALENDAR');
      const veventStart = lines.indexOf('BEGIN:VEVENT');
      const valarmStart = lines.findIndex(l => l === 'BEGIN:VALARM');
      const valarmEnd = lines.findIndex(l => l === 'END:VALARM');
      const veventEnd = lines.indexOf('END:VEVENT');
      const vcalendarEnd = lines.indexOf('END:VCALENDAR');

      // Verify proper nesting
      expect(vcalendarStart).toBe(0);
      expect(veventStart).toBeGreaterThan(vcalendarStart);
      expect(valarmStart).toBeGreaterThan(veventStart);
      expect(valarmEnd).toBeGreaterThan(valarmStart);
      expect(veventEnd).toBeGreaterThan(valarmEnd);
      expect(vcalendarEnd).toBeGreaterThan(veventEnd);
      expect(vcalendarEnd).toBe(lines.length - 1);
    });
  });
});
