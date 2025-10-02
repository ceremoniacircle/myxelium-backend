/**
 * Tests for Add-to-Calendar Link Generator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateGoogleCalendarLink,
  generateOutlookLink,
  generateYahooCalendarLink,
  generateAppleCalendarLink,
  generateAllCalendarLinks,
  generateCalendarLinksFromRegistration,
} from '@/lib/calendar/links';
import type { CalendarEvent, EventData, RegistrationData, ContactData } from '@/lib/calendar/types';

describe('Calendar Links Generator', () => {
  let mockEvent: CalendarEvent;
  let mockEventData: EventData;
  let mockRegistrationData: RegistrationData;
  let mockContactData: ContactData;

  beforeEach(() => {
    mockEvent = {
      title: 'AI Workshop 2025',
      description: 'Learn about artificial intelligence',
      location: 'https://zoom.us/j/123456789',
      startTime: '2025-10-01T14:00:00Z',
      durationMinutes: 60,
      timezone: 'America/Denver',
      organizerEmail: 'events@ceremonia.com',
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
      platform_join_url: 'https://zoom.us/j/987654321',
    };

    mockContactData = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
    };
  });

  describe('generateGoogleCalendarLink', () => {
    it('should generate valid Google Calendar URL', () => {
      const url = generateGoogleCalendarLink(mockEvent);

      expect(url).toContain('https://calendar.google.com/calendar/render');
      expect(url).toContain('action=TEMPLATE');
    });

    it('should include event title', () => {
      const url = generateGoogleCalendarLink(mockEvent);
      expect(url).toContain('text=AI+Workshop+2025');
    });

    it('should include start and end times in UTC', () => {
      const url = generateGoogleCalendarLink(mockEvent);

      // Should contain dates parameter with start/end times
      expect(url).toContain('dates=');
      expect(url).toMatch(/dates=\d{8}T\d{6}Z%2F\d{8}T\d{6}Z/);
    });

    it('should URL encode special characters in title', () => {
      const eventWithSpecialChars: CalendarEvent = {
        ...mockEvent,
        title: 'Workshop: AI & ML (2025)',
      };

      const url = generateGoogleCalendarLink(eventWithSpecialChars);

      // Title should be URL encoded
      expect(url).toContain('text=Workshop');
      expect(url).not.toContain('Workshop: AI & ML (2025)'); // Raw text shouldn't appear
    });

    it('should include description if provided', () => {
      const url = generateGoogleCalendarLink(mockEvent);
      expect(url).toContain('details=');
      expect(url).toContain('Learn+about+artificial+intelligence');
    });

    it('should include location if provided', () => {
      const url = generateGoogleCalendarLink(mockEvent);
      expect(url).toContain('location=');
      expect(url).toContain('zoom.us');
    });

    it('should omit description if not provided', () => {
      const eventWithoutDesc: CalendarEvent = {
        ...mockEvent,
        description: undefined,
      };

      const url = generateGoogleCalendarLink(eventWithoutDesc);
      expect(url).not.toContain('details=');
    });

    it('should omit location if not provided', () => {
      const eventWithoutLocation: CalendarEvent = {
        ...mockEvent,
        location: undefined,
      };

      const url = generateGoogleCalendarLink(eventWithoutLocation);
      expect(url).not.toContain('location=');
    });

    it('should handle long descriptions', () => {
      const eventWithLongDesc: CalendarEvent = {
        ...mockEvent,
        description: 'A'.repeat(500),
      };

      const url = generateGoogleCalendarLink(eventWithLongDesc);
      expect(url).toContain('details=');
    });

    it('should calculate correct end time based on duration', () => {
      const url = generateGoogleCalendarLink(mockEvent);

      // Extract dates parameter
      const datesMatch = url.match(/dates=(\d{8}T\d{6}Z)%2F(\d{8}T\d{6}Z)/);
      expect(datesMatch).toBeTruthy();

      if (datesMatch) {
        const [, startStr, endStr] = datesMatch;

        // Parse times
        const startTime = new Date(
          `${startStr.slice(0, 4)}-${startStr.slice(4, 6)}-${startStr.slice(6, 8)}T${startStr.slice(9, 11)}:${startStr.slice(11, 13)}:${startStr.slice(13, 15)}Z`
        );
        const endTime = new Date(
          `${endStr.slice(0, 4)}-${endStr.slice(4, 6)}-${endStr.slice(6, 8)}T${endStr.slice(9, 11)}:${endStr.slice(11, 13)}:${endStr.slice(13, 15)}Z`
        );

        // End time should be 60 minutes after start
        const durationMs = endTime.getTime() - startTime.getTime();
        expect(durationMs).toBe(60 * 60 * 1000);
      }
    });
  });

  describe('generateOutlookLink', () => {
    it('should generate valid Outlook Web URL', () => {
      const url = generateOutlookLink(mockEvent);

      expect(url).toContain('https://outlook.live.com/calendar');
      expect(url).toContain('path=%2Fcalendar%2Faction%2Fcompose');
      expect(url).toContain('rru=addevent');
    });

    it('should include event title as subject', () => {
      const url = generateOutlookLink(mockEvent);
      expect(url).toContain('subject=AI+Workshop+2025');
    });

    it('should include start and end times in ISO format', () => {
      const url = generateOutlookLink(mockEvent);

      expect(url).toContain('startdt=2025-10-01T14');
      expect(url).toContain('enddt=2025-10-01T15');
    });

    it('should include description as body', () => {
      const url = generateOutlookLink(mockEvent);
      expect(url).toContain('body=');
      expect(url).toContain('Learn');
    });

    it('should include location', () => {
      const url = generateOutlookLink(mockEvent);
      expect(url).toContain('location=');
      expect(url).toContain('zoom.us');
    });

    it('should URL encode parameters', () => {
      const eventWithSpecialChars: CalendarEvent = {
        ...mockEvent,
        title: 'Workshop & Training',
        description: 'Details: Important info',
      };

      const url = generateOutlookLink(eventWithSpecialChars);

      // Should be properly URL encoded
      expect(url).toContain('Workshop');
      expect(url).not.toContain('Workshop & Training'); // Raw text shouldn't appear
    });

    it('should omit optional fields if not provided', () => {
      const minimalEvent: CalendarEvent = {
        title: 'Test Event',
        startTime: '2025-10-01T14:00:00Z',
        durationMinutes: 60,
        timezone: 'America/Denver',
      };

      const url = generateOutlookLink(minimalEvent);

      expect(url).toContain('subject=Test+Event');
      expect(url).not.toContain('body=');
      expect(url).not.toContain('location=');
    });
  });

  describe('generateYahooCalendarLink', () => {
    it('should generate valid Yahoo Calendar URL', () => {
      const url = generateYahooCalendarLink(mockEvent);

      expect(url).toContain('https://calendar.yahoo.com/');
      expect(url).toContain('v=60');
    });

    it('should include event title', () => {
      const url = generateYahooCalendarLink(mockEvent);
      expect(url).toContain('title=AI+Workshop+2025');
    });

    it('should include start and end times', () => {
      const url = generateYahooCalendarLink(mockEvent);

      expect(url).toContain('st=');
      expect(url).toContain('et=');
      expect(url).toMatch(/st=\d{8}T\d{6}Z/);
      expect(url).toMatch(/et=\d{8}T\d{6}Z/);
    });

    it('should include description', () => {
      const url = generateYahooCalendarLink(mockEvent);
      expect(url).toContain('desc=');
    });

    it('should include location as in_loc', () => {
      const url = generateYahooCalendarLink(mockEvent);
      expect(url).toContain('in_loc=');
      expect(url).toContain('zoom.us');
    });

    it('should URL encode parameters correctly', () => {
      const eventWithSpecialChars: CalendarEvent = {
        ...mockEvent,
        title: 'Event: Part 1 & 2',
      };

      const url = generateYahooCalendarLink(eventWithSpecialChars);
      expect(url).toContain('title=Event');
    });

    it('should omit optional fields if not provided', () => {
      const minimalEvent: CalendarEvent = {
        title: 'Test Event',
        startTime: '2025-10-01T14:00:00Z',
        durationMinutes: 60,
        timezone: 'America/Denver',
      };

      const url = generateYahooCalendarLink(minimalEvent);

      expect(url).toContain('title=Test+Event');
      expect(url).not.toContain('desc=');
      expect(url).not.toContain('in_loc=');
    });
  });

  describe('generateAppleCalendarLink', () => {
    it('should generate data URL for Apple Calendar', () => {
      const icsContent = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR';
      const url = generateAppleCalendarLink(icsContent);

      expect(url).toContain('data:text/calendar;base64,');
    });

    it('should encode ICS content as base64', () => {
      const icsContent = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR';
      const url = generateAppleCalendarLink(icsContent);

      const base64Part = url.replace('data:text/calendar;base64,', '');
      expect(base64Part).toMatch(/^[A-Za-z0-9+/]+=*$/);

      // Verify it decodes correctly
      const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
      expect(decoded).toBe(icsContent);
    });

    it('should handle long ICS content', () => {
      const longIcsContent = 'BEGIN:VCALENDAR\r\n' + 'X'.repeat(1000) + '\r\nEND:VCALENDAR';
      const url = generateAppleCalendarLink(longIcsContent);

      expect(url).toContain('data:text/calendar;base64,');
      expect(url.length).toBeGreaterThan(1000);
    });
  });

  describe('generateAllCalendarLinks', () => {
    const mockIcsContent = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR';

    it('should generate links for all providers', () => {
      const links = generateAllCalendarLinks(mockEvent, mockIcsContent);

      expect(links.google).toBeTruthy();
      expect(links.outlook).toBeTruthy();
      expect(links.apple).toBeTruthy();
      expect(links.yahoo).toBeTruthy();
    });

    it('should generate Google Calendar link', () => {
      const links = generateAllCalendarLinks(mockEvent, mockIcsContent);
      expect(links.google).toContain('calendar.google.com');
    });

    it('should generate Outlook link', () => {
      const links = generateAllCalendarLinks(mockEvent, mockIcsContent);
      expect(links.outlook).toContain('outlook.live.com');
    });

    it('should generate Yahoo Calendar link', () => {
      const links = generateAllCalendarLinks(mockEvent, mockIcsContent);
      expect(links.yahoo).toContain('calendar.yahoo.com');
    });

    it('should generate Apple Calendar data URL', () => {
      const links = generateAllCalendarLinks(mockEvent, mockIcsContent);
      expect(links.apple).toContain('data:text/calendar;base64,');
    });

    it('should include same event data in all links', () => {
      const links = generateAllCalendarLinks(mockEvent, mockIcsContent);

      // All links should reference the same event
      expect(links.google).toContain('AI+Workshop+2025');
      expect(links.outlook).toContain('AI+Workshop+2025');
      expect(links.yahoo).toContain('AI+Workshop+2025');
    });
  });

  describe('generateCalendarLinksFromRegistration', () => {
    const mockIcsContent = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR';

    it('should generate links from database records', () => {
      const links = generateCalendarLinksFromRegistration(
        mockEventData,
        mockRegistrationData,
        mockContactData,
        mockIcsContent
      );

      expect(links.google).toBeTruthy();
      expect(links.outlook).toBeTruthy();
      expect(links.apple).toBeTruthy();
      expect(links.yahoo).toBeTruthy();
    });

    it('should use event title in links', () => {
      const links = generateCalendarLinksFromRegistration(
        mockEventData,
        mockRegistrationData,
        mockContactData,
        mockIcsContent
      );

      expect(links.google).toContain('AI+Workshop+2025');
      expect(links.outlook).toContain('AI+Workshop+2025');
    });

    it('should use registration-specific join URL', () => {
      const links = generateCalendarLinksFromRegistration(
        mockEventData,
        mockRegistrationData,
        mockContactData,
        mockIcsContent
      );

      expect(links.google).toContain('987654321');
      expect(links.outlook).toContain('987654321');
    });

    it('should fall back to event join URL if registration URL missing', () => {
      const regWithoutUrl: RegistrationData = {
        id: 'reg-123',
        platform_join_url: null,
      };

      const links = generateCalendarLinksFromRegistration(
        mockEventData,
        regWithoutUrl,
        mockContactData,
        mockIcsContent
      );

      expect(links.google).toContain('123456789');
    });

    it('should include event description in links', () => {
      const links = generateCalendarLinksFromRegistration(
        mockEventData,
        mockRegistrationData,
        mockContactData,
        mockIcsContent
      );

      expect(links.google).toContain('Learn');
    });

    it('should append join URL to description', () => {
      const links = generateCalendarLinksFromRegistration(
        mockEventData,
        mockRegistrationData,
        mockContactData,
        mockIcsContent
      );

      // Description should include both original description and join URL
      expect(links.google).toContain('Learn');
      expect(links.google).toContain('zoom.us');
    });

    it('should handle missing event description', () => {
      const eventWithoutDesc: EventData = {
        ...mockEventData,
        description: null,
      };

      const links = generateCalendarLinksFromRegistration(
        eventWithoutDesc,
        mockRegistrationData,
        mockContactData,
        mockIcsContent
      );

      // Should still include join URL in description
      expect(links.google).toContain('zoom.us');
    });
  });

  describe('URL Encoding', () => {
    it('should properly encode spaces in Google Calendar link', () => {
      const url = generateGoogleCalendarLink(mockEvent);
      expect(url).toContain('AI+Workshop+2025');
      expect(url).not.toContain('AI Workshop 2025');
    });

    it('should properly encode special characters in all links', () => {
      const eventWithSpecialChars: CalendarEvent = {
        ...mockEvent,
        title: 'Test & Demo: Part 1',
      };

      const googleUrl = generateGoogleCalendarLink(eventWithSpecialChars);
      const outlookUrl = generateOutlookLink(eventWithSpecialChars);
      const yahooUrl = generateYahooCalendarLink(eventWithSpecialChars);

      // None should have unencoded special characters
      expect(googleUrl).not.toContain('Test & Demo: Part 1');
      expect(outlookUrl).not.toContain('Test & Demo: Part 1');
      expect(yahooUrl).not.toContain('Test & Demo: Part 1');
    });

    it('should encode URLs in location field', () => {
      const url = generateGoogleCalendarLink(mockEvent);

      // URL should be encoded
      expect(url).toContain('location=');
      expect(url).toContain('https');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long event titles', () => {
      const longTitleEvent: CalendarEvent = {
        ...mockEvent,
        title: 'A'.repeat(200),
      };

      const googleUrl = generateGoogleCalendarLink(longTitleEvent);
      const outlookUrl = generateOutlookLink(longTitleEvent);

      expect(googleUrl).toBeTruthy();
      expect(outlookUrl).toBeTruthy();
    });

    it('should handle events with minimal information', () => {
      const minimalEvent: CalendarEvent = {
        title: 'Test',
        startTime: '2025-10-01T14:00:00Z',
        durationMinutes: 30,
        timezone: 'UTC',
      };

      const links = generateAllCalendarLinks(minimalEvent, 'ICS');

      expect(links.google).toContain('Test');
      expect(links.outlook).toContain('Test');
      expect(links.yahoo).toContain('Test');
      expect(links.apple).toContain('data:text/calendar');
    });

    it('should handle different timezones', () => {
      const eventWithDifferentTz: CalendarEvent = {
        ...mockEvent,
        timezone: 'Asia/Tokyo',
      };

      const links = generateAllCalendarLinks(eventWithDifferentTz, 'ICS');

      expect(links.google).toBeTruthy();
      expect(links.outlook).toBeTruthy();
    });

    it('should handle events with zero duration', () => {
      const zeroDurationEvent: CalendarEvent = {
        ...mockEvent,
        durationMinutes: 0,
      };

      const url = generateGoogleCalendarLink(zeroDurationEvent);

      // Start and end should be the same
      const datesMatch = url.match(/dates=(\d{8}T\d{6}Z)%2F(\d{8}T\d{6}Z)/);
      expect(datesMatch).toBeTruthy();

      if (datesMatch) {
        const [, startStr, endStr] = datesMatch;
        expect(startStr).toBe(endStr);
      }
    });
  });
});
