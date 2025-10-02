/**
 * Tests for Twilio Helper Functions
 */

import { describe, it, expect } from 'vitest';
import {
  validatePhoneNumber,
  normalizePhoneNumber,
  personalizeSMSTemplate,
  truncateSMS,
  isWithinQuietHours,
  getNextQuietHoursSendTime,
  handleAutoResponse,
  isAutoResponseKeyword,
  buildSMSPersonalizationData,
} from '@/lib/twilio/helpers';

describe('Twilio Helpers', () => {
  describe('validatePhoneNumber', () => {
    it('should validate E.164 format US phone numbers', () => {
      expect(validatePhoneNumber('+14155552671')).toBe(true);
      expect(validatePhoneNumber('+12125552671')).toBe(true);
    });

    it('should validate E.164 format international phone numbers', () => {
      expect(validatePhoneNumber('+442071838750')).toBe(true); // UK
      expect(validatePhoneNumber('+33123456789')).toBe(true); // France
      expect(validatePhoneNumber('+81312345678')).toBe(true); // Japan
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('415-555-2671')).toBe(false); // Not E.164
      expect(validatePhoneNumber('(415) 555-2671')).toBe(false); // Not E.164
      expect(validatePhoneNumber('4155552671')).toBe(false); // Missing country code
      expect(validatePhoneNumber('+1415555267')).toBe(false); // Too short
      expect(validatePhoneNumber('+141555526711234')).toBe(false); // Too long
      expect(validatePhoneNumber('invalid')).toBe(false);
      expect(validatePhoneNumber('')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validatePhoneNumber('+1')).toBe(false); // Too short
      expect(validatePhoneNumber('+')).toBe(false);
      expect(validatePhoneNumber('123')).toBe(false);
    });
  });

  describe('normalizePhoneNumber', () => {
    it('should normalize US phone numbers to E.164 format', () => {
      expect(normalizePhoneNumber('(415) 555-2671', 'US')).toBe('+14155552671');
      expect(normalizePhoneNumber('415-555-2671', 'US')).toBe('+14155552671');
      expect(normalizePhoneNumber('415.555.2671', 'US')).toBe('+14155552671');
      expect(normalizePhoneNumber('4155552671', 'US')).toBe('+14155552671');
    });

    it('should preserve already normalized E.164 numbers', () => {
      expect(normalizePhoneNumber('+14155552671', 'US')).toBe('+14155552671');
      expect(normalizePhoneNumber('+442071838750', 'GB')).toBe('+442071838750');
    });

    it('should handle phone numbers with spaces', () => {
      expect(normalizePhoneNumber('  415 555 2671  ', 'US')).toBe('+14155552671');
      expect(normalizePhoneNumber('+1 415 555 2671', 'US')).toBe('+14155552671');
    });

    it('should handle different country codes', () => {
      expect(normalizePhoneNumber('020 7183 8750', 'GB')).toBe('+442071838750');
      expect(normalizePhoneNumber('01 23 45 67 89', 'FR')).toBe('+33123456789');
    });

    it('should default to US country code', () => {
      expect(normalizePhoneNumber('4155552671')).toBe('+14155552671');
    });

    it('should handle invalid phone numbers gracefully', () => {
      const result = normalizePhoneNumber('invalid', 'US');
      expect(result).toBe('invalid'); // Returns original on error
    });

    it('should handle empty phone numbers', () => {
      expect(normalizePhoneNumber('')).toBe('');
      expect(normalizePhoneNumber('   ')).toBe('');
    });
  });

  describe('personalizeSMSTemplate', () => {
    it('should replace single token with value', () => {
      const result = personalizeSMSTemplate('Hi {{firstName}}!', { firstName: 'John' });
      expect(result).toBe('Hi John!');
    });

    it('should replace multiple tokens with values', () => {
      const result = personalizeSMSTemplate('Hi {{firstName}}, join {{eventTitle}}!', {
        firstName: 'John',
        eventTitle: 'AI Webinar',
      });
      expect(result).toBe('Hi John, join AI Webinar!');
    });

    it('should replace missing tokens with empty string', () => {
      const result = personalizeSMSTemplate('Hi {{firstName}} {{lastName}}!', {
        firstName: 'John',
      });
      expect(result).toBe('Hi John !');
    });

    it('should replace null values with empty string', () => {
      const result = personalizeSMSTemplate('Hi {{firstName}}!', { firstName: null });
      expect(result).toBe('Hi !');
    });

    it('should replace undefined values with empty string', () => {
      const result = personalizeSMSTemplate('Hi {{firstName}}!', { firstName: undefined });
      expect(result).toBe('Hi !');
    });

    it('should handle empty template', () => {
      const result = personalizeSMSTemplate('', { firstName: 'John' });
      expect(result).toBe('');
    });

    it('should handle template with no tokens', () => {
      const result = personalizeSMSTemplate('Hello World!', { firstName: 'John' });
      expect(result).toBe('Hello World!');
    });
  });

  describe('truncateSMS', () => {
    it('should not truncate messages shorter than max length', () => {
      const message = 'This is a short message';
      expect(truncateSMS(message, 160)).toBe(message);
    });

    it('should truncate messages longer than max length and add ellipsis', () => {
      const message = 'A'.repeat(200);
      const result = truncateSMS(message, 160);
      expect(result.length).toBe(160);
      expect(result.endsWith('...')).toBe(true);
      expect(result.substring(0, 157)).toBe('A'.repeat(157));
    });

    it('should use default max length of 160', () => {
      const message = 'A'.repeat(200);
      const result = truncateSMS(message);
      expect(result.length).toBe(160);
    });

    it('should handle custom max length', () => {
      const message = 'This is a longer message that needs to be truncated';
      const result = truncateSMS(message, 20);
      expect(result.length).toBe(20);
      expect(result).toBe('This is a longer ...');
    });

    it('should handle empty message', () => {
      expect(truncateSMS('')).toBe('');
    });

    it('should handle message exactly at max length', () => {
      const message = 'A'.repeat(160);
      expect(truncateSMS(message, 160)).toBe(message);
    });
  });

  describe('isWithinQuietHours', () => {
    it('should return true for times within quiet hours (9am-9pm)', () => {
      // 2025-10-01 10:00 AM PDT (within quiet hours)
      const date = new Date('2025-10-01T17:00:00Z'); // 10 AM PDT
      expect(isWithinQuietHours('America/Los_Angeles', date)).toBe(true);
    });

    it('should return true for 9am exactly (start of quiet hours)', () => {
      // 2025-10-01 9:00 AM PDT
      const date = new Date('2025-10-01T16:00:00Z'); // 9 AM PDT
      expect(isWithinQuietHours('America/Los_Angeles', date)).toBe(true);
    });

    it('should return false for 9pm exactly (end of quiet hours)', () => {
      // 2025-10-01 9:00 PM PDT
      const date = new Date('2025-10-02T04:00:00Z'); // 9 PM PDT
      expect(isWithinQuietHours('America/Los_Angeles', date)).toBe(false);
    });

    it('should return false for times before 9am', () => {
      // 2025-10-01 8:00 AM PDT (before quiet hours)
      const date = new Date('2025-10-01T15:00:00Z'); // 8 AM PDT
      expect(isWithinQuietHours('America/Los_Angeles', date)).toBe(false);
    });

    it('should return false for times after 9pm', () => {
      // 2025-10-01 10:00 PM PDT (after quiet hours)
      const date = new Date('2025-10-02T05:00:00Z'); // 10 PM PDT
      expect(isWithinQuietHours('America/Los_Angeles', date)).toBe(false);
    });

    it('should handle different timezones', () => {
      // 2025-10-01 10:00 AM EDT (within quiet hours)
      const date = new Date('2025-10-01T14:00:00Z'); // 10 AM EDT
      expect(isWithinQuietHours('America/New_York', date)).toBe(true);
    });

    it('should default to current time if not provided', () => {
      // This test just ensures the function doesn't crash
      const result = isWithinQuietHours('America/Los_Angeles');
      expect(typeof result).toBe('boolean');
    });

    it('should handle invalid timezone gracefully', () => {
      const date = new Date('2025-10-01T17:00:00Z');
      const result = isWithinQuietHours('Invalid/Timezone', date);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getNextQuietHoursSendTime', () => {
    it('should return same time if within quiet hours', () => {
      const date = new Date('2025-10-01T17:00:00Z'); // 10 AM PDT
      const result = getNextQuietHoursSendTime('America/Los_Angeles', date);
      expect(result).toEqual(date);
    });

    it('should return next 9am if before quiet hours', () => {
      const date = new Date('2025-10-01T15:00:00Z'); // 8 AM PDT
      const result = getNextQuietHoursSendTime('America/Los_Angeles', date);

      // Should be same day at 9 AM
      expect(result.getDate()).toBe(date.getDate());
      expect(result.getHours()).toBe(9);
    });

    it('should return next day 9am if after quiet hours', () => {
      const date = new Date('2025-10-02T05:00:00Z'); // 10 PM PDT (Oct 1)
      const result = getNextQuietHoursSendTime('America/Los_Angeles', date);

      // Should be next day at 9 AM
      expect(result.getDate()).toBe(date.getDate() + 1);
      expect(result.getHours()).toBe(9);
    });

    it('should handle different timezones', () => {
      const date = new Date('2025-10-01T12:00:00Z'); // 8 AM EDT
      const result = getNextQuietHoursSendTime('America/New_York', date);

      // Should be same day at 9 AM
      expect(result.getDate()).toBe(date.getDate());
      expect(result.getHours()).toBe(9);
    });

    it('should default to current time if not provided', () => {
      const result = getNextQuietHoursSendTime('America/Los_Angeles');
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('handleAutoResponse', () => {
    it('should return unsubscribe message for STOP', () => {
      const result = handleAutoResponse('STOP');
      expect(result).toContain('unsubscribed');
      expect(result).toContain('START');
    });

    it('should return unsubscribe message for STOP variants', () => {
      expect(handleAutoResponse('STOPALL')).toContain('unsubscribed');
      expect(handleAutoResponse('UNSUBSCRIBE')).toContain('unsubscribed');
      expect(handleAutoResponse('CANCEL')).toContain('unsubscribed');
      expect(handleAutoResponse('END')).toContain('unsubscribed');
      expect(handleAutoResponse('QUIT')).toContain('unsubscribed');
    });

    it('should return resubscribe message for START', () => {
      const result = handleAutoResponse('START');
      expect(result).toContain('re-subscribed');
      expect(result).toContain('HELP');
      expect(result).toContain('STOP');
    });

    it('should return resubscribe message for START variants', () => {
      expect(handleAutoResponse('YES')).toContain('re-subscribed');
      expect(handleAutoResponse('UNSTOP')).toContain('re-subscribed');
    });

    it('should return help message for HELP', () => {
      const result = handleAutoResponse('HELP');
      expect(result).toContain('Ceremonia');
      expect(result).toContain('STOP');
      expect(result).toContain('START');
    });

    it('should return help message for HELP variants', () => {
      expect(handleAutoResponse('INFO')).toContain('Ceremonia');
    });

    it('should be case-insensitive', () => {
      expect(handleAutoResponse('stop')).toContain('unsubscribed');
      expect(handleAutoResponse('Stop')).toContain('unsubscribed');
      expect(handleAutoResponse('STOP')).toContain('unsubscribed');
      expect(handleAutoResponse('start')).toContain('re-subscribed');
      expect(handleAutoResponse('help')).toContain('Ceremonia');
    });

    it('should handle whitespace', () => {
      expect(handleAutoResponse('  STOP  ')).toContain('unsubscribed');
      expect(handleAutoResponse('  START  ')).toContain('re-subscribed');
    });

    it('should return null for non-keywords', () => {
      expect(handleAutoResponse('HELLO')).toBeNull();
      expect(handleAutoResponse('Thanks')).toBeNull();
      expect(handleAutoResponse('OK')).toBeNull();
      expect(handleAutoResponse('123')).toBeNull();
      expect(handleAutoResponse('')).toBeNull();
    });
  });

  describe('isAutoResponseKeyword', () => {
    it('should return true for valid keywords', () => {
      expect(isAutoResponseKeyword('STOP')).toBe(true);
      expect(isAutoResponseKeyword('START')).toBe(true);
      expect(isAutoResponseKeyword('HELP')).toBe(true);
      expect(isAutoResponseKeyword('STOPALL')).toBe(true);
      expect(isAutoResponseKeyword('UNSUBSCRIBE')).toBe(true);
    });

    it('should return false for non-keywords', () => {
      expect(isAutoResponseKeyword('HELLO')).toBe(false);
      expect(isAutoResponseKeyword('Thanks')).toBe(false);
      expect(isAutoResponseKeyword('')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isAutoResponseKeyword('stop')).toBe(true);
      expect(isAutoResponseKeyword('Start')).toBe(true);
      expect(isAutoResponseKeyword('HELP')).toBe(true);
    });
  });

  describe('buildSMSPersonalizationData', () => {
    it('should build data from contact only', () => {
      const contact = {
        first_name: 'John',
        last_name: 'Doe',
        phone: '+14155552671',
      };

      const result = buildSMSPersonalizationData(contact);

      expect(result).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        phone: '+14155552671',
      });
    });

    it('should include event data when provided', () => {
      const contact = {
        first_name: 'John',
        last_name: 'Doe',
        phone: '+14155552671',
      };

      const event = {
        title: 'AI Webinar',
        scheduled_at: '2025-10-01T17:00:00Z',
        timezone: 'America/Los_Angeles',
      };

      const result = buildSMSPersonalizationData(contact, event);

      expect(result.firstName).toBe('John');
      expect(result.eventTitle).toBe('AI Webinar');
      expect(result.eventDate).toBeDefined();
      expect(result.eventDate).toContain('Oct');
    });

    it('should include registration data when provided', () => {
      const contact = {
        first_name: 'John',
        last_name: 'Doe',
        phone: '+14155552671',
      };

      const registration = {
        platform_join_url: 'https://zoom.us/j/123',
      };

      const result = buildSMSPersonalizationData(contact, null, registration);

      expect(result.joinUrl).toBe('https://zoom.us/j/123');
    });

    it('should handle missing contact fields', () => {
      const contact = {
        first_name: null,
        last_name: null,
        phone: null,
      };

      const result = buildSMSPersonalizationData(contact);

      expect(result).toEqual({
        firstName: '',
        lastName: '',
        phone: '',
      });
    });

    it('should handle missing event fields', () => {
      const contact = {
        first_name: 'John',
        last_name: 'Doe',
        phone: '+14155552671',
      };

      const event = {
        title: null,
        scheduled_at: null,
        timezone: null,
      };

      const result = buildSMSPersonalizationData(contact, event);

      expect(result.eventTitle).toBe('');
      expect(result.eventDate).toBeUndefined();
    });

    it('should use default timezone when not provided', () => {
      const contact = {
        first_name: 'John',
        last_name: 'Doe',
        phone: '+14155552671',
      };

      const event = {
        title: 'AI Webinar',
        scheduled_at: '2025-10-01T17:00:00Z',
        timezone: null,
      };

      const result = buildSMSPersonalizationData(contact, event);

      expect(result.eventDate).toBeDefined();
    });

    it('should build complete data with all fields', () => {
      const contact = {
        first_name: 'John',
        last_name: 'Doe',
        phone: '+14155552671',
      };

      const event = {
        title: 'AI Webinar',
        scheduled_at: '2025-10-01T17:00:00Z',
        timezone: 'America/Los_Angeles',
      };

      const registration = {
        platform_join_url: 'https://zoom.us/j/123',
      };

      const result = buildSMSPersonalizationData(contact, event, registration);

      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.phone).toBe('+14155552671');
      expect(result.eventTitle).toBe('AI Webinar');
      expect(result.eventDate).toBeDefined();
      expect(result.joinUrl).toBe('https://zoom.us/j/123');
    });
  });
});
