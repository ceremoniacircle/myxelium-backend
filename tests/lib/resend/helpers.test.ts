/**
 * Tests for Resend Helper Functions
 */

import { describe, it, expect } from 'vitest';
import {
  personalizeTemplate,
  formatEventDate,
  textToHtml,
  stripHtml,
  isValidEmail,
  buildPersonalizationData,
} from '@/lib/resend/helpers';

describe('Resend Helpers', () => {
  describe('personalizeTemplate', () => {
    it('should replace single token with value', () => {
      const result = personalizeTemplate('Hi {{firstName}}!', { firstName: 'John' });
      expect(result).toBe('Hi John!');
    });

    it('should replace multiple tokens with values', () => {
      const result = personalizeTemplate('Hi {{firstName}} {{lastName}}!', {
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result).toBe('Hi John Doe!');
    });

    it('should replace the same token multiple times', () => {
      const result = personalizeTemplate('{{name}}, welcome! {{name}} is awesome!', {
        name: 'Alice',
      });
      expect(result).toBe('Alice, welcome! Alice is awesome!');
    });

    it('should replace missing tokens with empty string', () => {
      const result = personalizeTemplate('Hi {{firstName}} {{lastName}}!', {
        firstName: 'John',
      });
      expect(result).toBe('Hi John !');
    });

    it('should replace null values with empty string', () => {
      const result = personalizeTemplate('Hi {{firstName}}!', { firstName: null });
      expect(result).toBe('Hi !');
    });

    it('should replace undefined values with empty string', () => {
      const result = personalizeTemplate('Hi {{firstName}}!', { firstName: undefined });
      expect(result).toBe('Hi !');
    });

    it('should handle empty template', () => {
      const result = personalizeTemplate('', { firstName: 'John' });
      expect(result).toBe('');
    });

    it('should handle template with no tokens', () => {
      const result = personalizeTemplate('Hello World!', { firstName: 'John' });
      expect(result).toBe('Hello World!');
    });

    it('should handle complex template with multiple tokens', () => {
      const result = personalizeTemplate(
        'Hi {{firstName}}, join {{eventTitle}} on {{eventDate}}! Click {{joinUrl}}',
        {
          firstName: 'John',
          eventTitle: 'AI Webinar',
          eventDate: 'October 1, 2025',
          joinUrl: 'https://zoom.us/j/123',
        }
      );
      expect(result).toBe(
        'Hi John, join AI Webinar on October 1, 2025! Click https://zoom.us/j/123'
      );
    });

    it('should handle numbers by converting to string', () => {
      const result = personalizeTemplate('Number: {{count}}', { count: '42' });
      expect(result).toBe('Number: 42');
    });
  });

  describe('formatEventDate', () => {
    it('should format ISO date with default timezone', () => {
      const result = formatEventDate('2025-10-01T17:00:00Z');
      // PDT is UTC-7, so 17:00 UTC = 10:00 AM PDT
      expect(result).toContain('Wednesday, October 1, 2025');
      expect(result).toContain('10:00 AM');
      expect(result).toContain('PDT');
    });

    it('should format ISO date with custom timezone', () => {
      const result = formatEventDate('2025-10-01T17:00:00Z', 'America/New_York');
      // EDT is UTC-4, so 17:00 UTC = 1:00 PM EDT
      expect(result).toContain('Wednesday, October 1, 2025');
      expect(result).toContain('1:00 PM');
      expect(result).toContain('EDT');
    });

    it('should format ISO date with UTC timezone', () => {
      const result = formatEventDate('2025-10-01T17:00:00Z', 'UTC');
      expect(result).toContain('Wednesday, October 1, 2025');
      expect(result).toContain('5:00 PM');
      expect(result).toContain('UTC');
    });

    it('should handle invalid date string gracefully', () => {
      const result = formatEventDate('invalid-date');
      expect(result).toBe('invalid-date');
    });

    it('should handle different date formats', () => {
      const result = formatEventDate('2025-12-25T12:00:00-08:00', 'America/Los_Angeles');
      expect(result).toContain('Thursday, December 25, 2025');
      expect(result).toContain('12:00 PM');
    });
  });

  describe('textToHtml', () => {
    it('should convert single line to paragraph', () => {
      const result = textToHtml('Hello World');
      expect(result).toBe('<p>Hello World</p>');
    });

    it('should convert single line break to <br> tag', () => {
      const result = textToHtml('Line 1\nLine 2');
      expect(result).toBe('<p>Line 1<br>Line 2</p>');
    });

    it('should convert double line break to separate paragraphs', () => {
      const result = textToHtml('Paragraph 1\n\nParagraph 2');
      expect(result).toBe('<p>Paragraph 1</p>\n<p>Paragraph 2</p>');
    });

    it('should handle multiple paragraphs with line breaks', () => {
      const result = textToHtml('Para 1\nLine 2\n\nPara 2\nLine 2');
      expect(result).toBe('<p>Para 1<br>Line 2</p>\n<p>Para 2<br>Line 2</p>');
    });

    it('should handle empty string', () => {
      const result = textToHtml('');
      expect(result).toBe('');
    });

    it('should handle complex multi-paragraph text', () => {
      const text = 'Welcome!\n\nThis is line 1\nThis is line 2\n\nThank you!';
      const result = textToHtml(text);
      expect(result).toBe(
        '<p>Welcome!</p>\n<p>This is line 1<br>This is line 2</p>\n<p>Thank you!</p>'
      );
    });
  });

  describe('stripHtml', () => {
    it('should remove simple HTML tags', () => {
      const result = stripHtml('<p>Hello World</p>');
      expect(result).toBe('Hello World');
    });

    it('should remove multiple HTML tags', () => {
      const result = stripHtml('<div><p>Hello</p><p>World</p></div>');
      expect(result).toBe('HelloWorld');
    });

    it('should replace HTML entities', () => {
      const result = stripHtml('Test&nbsp;&amp;&lt;&gt;&quot;');
      expect(result).toBe('Test &<>"');
    });

    it('should handle complex HTML', () => {
      const result = stripHtml('<div class="test"><p>Hello <strong>World</strong></p></div>');
      expect(result).toBe('Hello World');
    });

    it('should handle empty string', () => {
      const result = stripHtml('');
      expect(result).toBe('');
    });

    it('should handle text without HTML', () => {
      const result = stripHtml('Plain text');
      expect(result).toBe('Plain text');
    });

    it('should trim whitespace', () => {
      const result = stripHtml('  <p>  Hello  </p>  ');
      expect(result).toBe('Hello');
    });

    it('should handle br tags and preserve spacing', () => {
      const result = stripHtml('<p>Line 1<br>Line 2</p>');
      expect(result).toBe('Line 1Line 2');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.com')).toBe(true);
      expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
      expect(isValidEmail('user_name@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('invalid@example')).toBe(false);
      expect(isValidEmail('invalid @example.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should reject emails with multiple @ symbols', () => {
      expect(isValidEmail('test@@example.com')).toBe(false);
      expect(isValidEmail('test@test@example.com')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidEmail('a@b.c')).toBe(true); // Shortest valid email
      expect(isValidEmail('test@subdomain.example.com')).toBe(true); // Subdomain
    });
  });

  describe('buildPersonalizationData', () => {
    it('should build data from contact only', () => {
      const contact = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };

      const result = buildPersonalizationData(contact);

      expect(result).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });
    });

    it('should build data from contact and event', () => {
      const contact = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };

      const event = {
        title: 'AI Webinar',
        scheduled_at: '2025-10-01T17:00:00Z',
        timezone: 'America/Los_Angeles',
      };

      const result = buildPersonalizationData(contact, event);

      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.eventTitle).toBe('AI Webinar');
      expect(result.eventDate).toContain('Wednesday, October 1, 2025');
    });

    it('should build data from contact, event, and registration', () => {
      const contact = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };

      const event = {
        title: 'AI Webinar',
        scheduled_at: '2025-10-01T17:00:00Z',
        timezone: 'America/Los_Angeles',
      };

      const registration = {
        platform_join_url: 'https://zoom.us/j/123456789',
      };

      const result = buildPersonalizationData(contact, event, registration);

      expect(result.firstName).toBe('John');
      expect(result.eventTitle).toBe('AI Webinar');
      expect(result.joinUrl).toBe('https://zoom.us/j/123456789');
    });

    it('should handle null/undefined values in contact', () => {
      const contact = {
        first_name: null,
        last_name: undefined,
        email: null,
      };

      const result = buildPersonalizationData(contact);

      expect(result).toEqual({
        firstName: '',
        lastName: '',
        email: '',
      });
    });

    it('should handle null event', () => {
      const contact = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };

      const result = buildPersonalizationData(contact, null);

      expect(result).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });
    });

    it('should handle event without scheduled_at', () => {
      const contact = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };

      const event = {
        title: 'AI Webinar',
        scheduled_at: null,
        timezone: 'America/Los_Angeles',
      };

      const result = buildPersonalizationData(contact, event);

      expect(result.firstName).toBe('John');
      expect(result.eventTitle).toBe('AI Webinar');
      expect(result.eventDate).toBeUndefined();
    });

    it('should handle registration without join URL', () => {
      const contact = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };

      const registration = {
        platform_join_url: null,
      };

      const result = buildPersonalizationData(contact, null, registration);

      expect(result.firstName).toBe('John');
      expect(result.joinUrl).toBeUndefined();
    });

    it('should use default timezone when not specified', () => {
      const contact = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };

      const event = {
        title: 'AI Webinar',
        scheduled_at: '2025-10-01T17:00:00Z',
        timezone: null,
      };

      const result = buildPersonalizationData(contact, event);

      expect(result.eventDate).toContain('PDT'); // Default is America/Los_Angeles
    });
  });
});
