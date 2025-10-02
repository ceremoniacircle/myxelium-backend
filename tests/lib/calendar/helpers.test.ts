/**
 * Tests for Calendar Helper Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  formatDateForICS,
  escapeICSText,
  generateUID,
  formatDuration,
  foldLine,
} from '@/lib/calendar/helpers';

describe('Calendar Helpers', () => {
  describe('formatDateForICS', () => {
    it('should format date in UTC format with Z suffix', () => {
      const date = new Date('2025-10-01T14:00:00Z');
      const formatted = formatDateForICS(date, true);
      expect(formatted).toBe('20251001T140000Z');
    });

    it('should format date in local format without Z suffix', () => {
      const date = new Date('2025-10-01T14:00:00');
      const formatted = formatDateForICS(date, false);
      expect(formatted).toMatch(/^\d{8}T\d{6}$/);
      expect(formatted).not.toContain('Z');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date('2025-01-05T09:05:03Z');
      const formatted = formatDateForICS(date, true);
      expect(formatted).toBe('20250105T090503Z');
    });

    it('should handle midnight correctly', () => {
      const date = new Date('2025-10-01T00:00:00Z');
      const formatted = formatDateForICS(date, true);
      expect(formatted).toBe('20251001T000000Z');
    });

    it('should handle end of year', () => {
      const date = new Date('2025-12-31T23:59:59Z');
      const formatted = formatDateForICS(date, true);
      expect(formatted).toBe('20251231T235959Z');
    });
  });

  describe('escapeICSText', () => {
    it('should escape semicolons', () => {
      const text = 'Join us for a workshop; bring your laptop';
      const escaped = escapeICSText(text);
      expect(escaped).toBe('Join us for a workshop\\; bring your laptop');
    });

    it('should escape commas', () => {
      const text = 'Topics: AI, ML, Data Science';
      const escaped = escapeICSText(text);
      expect(escaped).toBe('Topics: AI\\, ML\\, Data Science');
    });

    it('should escape newlines', () => {
      const text = 'Line 1\nLine 2';
      const escaped = escapeICSText(text);
      expect(escaped).toBe('Line 1\\nLine 2');
    });

    it('should escape backslashes', () => {
      const text = 'Path: C:\\Users\\Documents';
      const escaped = escapeICSText(text);
      expect(escaped).toBe('Path: C:\\\\Users\\\\Documents');
    });

    it('should remove carriage returns', () => {
      const text = 'Line 1\r\nLine 2';
      const escaped = escapeICSText(text);
      expect(escaped).toBe('Line 1\\nLine 2');
    });

    it('should handle multiple special characters', () => {
      const text = 'Hello; world,\nthis is a test\\path';
      const escaped = escapeICSText(text);
      expect(escaped).toBe('Hello\\; world\\,\\nthis is a test\\\\path');
    });

    it('should handle empty strings', () => {
      expect(escapeICSText('')).toBe('');
    });

    it('should handle text without special characters', () => {
      const text = 'Hello World';
      expect(escapeICSText(text)).toBe('Hello World');
    });
  });

  describe('generateUID', () => {
    it('should generate UID with registration ID', () => {
      const regId = '550e8400-e29b-41d4-a716-446655440000';
      const uid = generateUID(regId);
      expect(uid).toBe('registration-550e8400-e29b-41d4-a716-446655440000@ceremonia.com');
    });

    it('should include @ceremonia.com domain', () => {
      const uid = generateUID('test-123');
      expect(uid).toContain('@ceremonia.com');
    });

    it('should prefix with "registration-"', () => {
      const uid = generateUID('abc-xyz');
      expect(uid).toMatch(/^registration-/);
    });

    it('should handle various registration ID formats', () => {
      expect(generateUID('uuid-123')).toBe('registration-uuid-123@ceremonia.com');
      expect(generateUID('12345')).toBe('registration-12345@ceremonia.com');
      expect(generateUID('reg_abc_xyz')).toBe('registration-reg_abc_xyz@ceremonia.com');
    });
  });

  describe('formatDuration', () => {
    it('should format 60 minutes as 1 hour', () => {
      expect(formatDuration(60)).toBe('-PT1H');
    });

    it('should format 1440 minutes as 24 hours', () => {
      expect(formatDuration(1440)).toBe('-PT24H');
    });

    it('should format 90 minutes as 1 hour 30 minutes', () => {
      expect(formatDuration(90)).toBe('-PT1H30M');
    });

    it('should format 30 minutes', () => {
      expect(formatDuration(30)).toBe('-PT30M');
    });

    it('should format 1 minute', () => {
      expect(formatDuration(1)).toBe('-PT1M');
    });

    it('should handle 0 minutes', () => {
      expect(formatDuration(0)).toBe('PT0M');
    });

    it('should format 125 minutes as 2 hours 5 minutes', () => {
      expect(formatDuration(125)).toBe('-PT2H5M');
    });

    it('should include negative sign for past durations', () => {
      const duration = formatDuration(60);
      expect(duration).toMatch(/^-PT/);
    });
  });

  describe('foldLine', () => {
    it('should not fold lines under 75 characters', () => {
      const text = 'SUMMARY:Short event title';
      expect(foldLine(text)).toBe(text);
    });

    it('should fold lines over 75 characters', () => {
      const text = 'DESCRIPTION:' + 'A'.repeat(100);
      const folded = foldLine(text);

      expect(folded).toContain('\r\n');
      const lines = folded.split('\r\n');
      expect(lines.length).toBeGreaterThan(1);

      // First line should be 75 chars
      expect(lines[0].length).toBe(75);

      // Continuation lines should start with space
      expect(lines[1][0]).toBe(' ');
    });

    it('should fold very long lines multiple times', () => {
      const text = 'DESCRIPTION:' + 'B'.repeat(200);
      const folded = foldLine(text);

      const lines = folded.split('\r\n');
      expect(lines.length).toBeGreaterThan(2);

      // All continuation lines should start with space
      for (let i = 1; i < lines.length; i++) {
        expect(lines[i][0]).toBe(' ');
      }
    });

    it('should preserve content when folded', () => {
      const text = 'SUMMARY:' + 'C'.repeat(150);
      const folded = foldLine(text);

      // Remove CRLF and spaces to get original content
      const unfolded = folded.replace(/\r\n /g, '');
      expect(unfolded).toBe(text);
    });

    it('should handle exact 75 character boundary', () => {
      const text = 'A'.repeat(75);
      expect(foldLine(text)).toBe(text);
    });

    it('should fold at 76th character', () => {
      const text = 'A'.repeat(76);
      const folded = foldLine(text);

      expect(folded).toContain('\r\n');
      const lines = folded.split('\r\n');
      expect(lines[0].length).toBe(75);
      expect(lines[1]).toBe(' A');
    });
  });

  describe('Integration Tests', () => {
    it('should generate properly formatted UID and escape it if needed', () => {
      const regId = 'test;id,with\\special';
      const uid = generateUID(regId);
      const escaped = escapeICSText(uid);

      expect(escaped).toContain('\\;');
      expect(escaped).toContain('\\,');
      expect(escaped).toContain('\\\\');
    });

    it('should format and fold a complete ICS line', () => {
      const longDescription = 'This is a very long description that exceeds 75 characters and needs to be folded according to RFC 5545 specifications for proper calendar file formatting';
      const escaped = escapeICSText(longDescription);
      const line = `DESCRIPTION:${escaped}`;
      const folded = foldLine(line);

      expect(folded).toContain('\r\n');
      const unfolded = folded.replace(/\r\n /g, '');
      expect(unfolded).toBe(line);
    });

    it('should create valid alarm trigger for 24-hour reminder', () => {
      const trigger = formatDuration(24 * 60);
      expect(trigger).toBe('-PT24H');

      // Verify it matches RFC 5545 format
      expect(trigger).toMatch(/^-PT\d+H$/);
    });
  });
});
