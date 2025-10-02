/**
 * Tests for Twilio Client Configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Twilio to prevent errors when credentials are missing
vi.mock('twilio', () => ({
  default: vi.fn().mockImplementation((accountSid?: string, authToken?: string) => {
    if (!accountSid || !authToken) {
      console.error(
        '[Twilio] TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN environment variable is not set. SMS sending will fail.'
      );
    }
    return {
      messages: {
        create: vi.fn(),
      },
    };
  }),
  validateRequest: vi.fn().mockReturnValue(true),
}));

describe('Twilio Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Client Initialization', () => {
    it('should create Twilio client with credentials from environment', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC_test123';
      process.env.TWILIO_AUTH_TOKEN = 'auth_test123';
      process.env.TWILIO_PHONE_NUMBER = '+14155552671';

      const { twilioClient } = await import('@/lib/twilio/client');

      expect(twilioClient).toBeDefined();
    });

    it('should create Twilio client even when credentials are not set', async () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;

      // Twilio client is still created, just with undefined credentials
      // This matches the Resend behavior where the client is created regardless
      const clientModule = await import('@/lib/twilio/client');

      // The module exports the client, even if credentials are missing
      expect(clientModule).toBeDefined();
    });
  });

  describe('Phone Number Configuration', () => {
    it('should export TWILIO_PHONE_NUMBER from environment', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC_test123';
      process.env.TWILIO_AUTH_TOKEN = 'auth_test123';
      process.env.TWILIO_PHONE_NUMBER = '+14155552671';

      const { TWILIO_PHONE_NUMBER } = await import('@/lib/twilio/client');

      expect(TWILIO_PHONE_NUMBER).toBe('+14155552671');
    });

    it('should handle missing TWILIO_PHONE_NUMBER', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC_test123';
      process.env.TWILIO_AUTH_TOKEN = 'auth_test123';
      delete process.env.TWILIO_PHONE_NUMBER;

      const { TWILIO_PHONE_NUMBER } = await import('@/lib/twilio/client');

      expect(TWILIO_PHONE_NUMBER).toBeUndefined();
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should export rate limit constants', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC_test123';
      process.env.TWILIO_AUTH_TOKEN = 'auth_test123';

      const { RATE_LIMIT_PER_MINUTE, RATE_LIMIT_PER_SECOND } =
        await import('@/lib/twilio/client');

      expect(RATE_LIMIT_PER_MINUTE).toBe(100);
      expect(RATE_LIMIT_PER_SECOND).toBe(10);
    });
  });

  describe('SMS Length Configuration', () => {
    it('should export SMS length limits', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC_test123';
      process.env.TWILIO_AUTH_TOKEN = 'auth_test123';

      const { SMS_MAX_LENGTH, SMS_MAX_LENGTH_EXTENDED } =
        await import('@/lib/twilio/client');

      expect(SMS_MAX_LENGTH).toBe(160);
      expect(SMS_MAX_LENGTH_EXTENDED).toBe(1600);
    });
  });

  describe('Quiet Hours Configuration', () => {
    it('should export quiet hours constants', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC_test123';
      process.env.TWILIO_AUTH_TOKEN = 'auth_test123';

      const { QUIET_HOURS_START, QUIET_HOURS_END } =
        await import('@/lib/twilio/client');

      expect(QUIET_HOURS_START).toBe(9); // 9 AM
      expect(QUIET_HOURS_END).toBe(21); // 9 PM
    });
  });

  describe('isTwilioConfigured', () => {
    it('should return true when all credentials are set', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC_test123';
      process.env.TWILIO_AUTH_TOKEN = 'auth_test123';
      process.env.TWILIO_PHONE_NUMBER = '+14155552671';

      const { isTwilioConfigured } = await import('@/lib/twilio/client');

      expect(isTwilioConfigured()).toBe(true);
    });

    it('should return false when TWILIO_ACCOUNT_SID is not set', async () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      process.env.TWILIO_AUTH_TOKEN = 'auth_test123';
      process.env.TWILIO_PHONE_NUMBER = '+14155552671';

      const { isTwilioConfigured } = await import('@/lib/twilio/client');

      expect(isTwilioConfigured()).toBe(false);
    });

    it('should return false when TWILIO_AUTH_TOKEN is not set', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC_test123';
      delete process.env.TWILIO_AUTH_TOKEN;
      process.env.TWILIO_PHONE_NUMBER = '+14155552671';

      const { isTwilioConfigured } = await import('@/lib/twilio/client');

      expect(isTwilioConfigured()).toBe(false);
    });

    it('should return false when TWILIO_PHONE_NUMBER is not set', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC_test123';
      process.env.TWILIO_AUTH_TOKEN = 'auth_test123';
      delete process.env.TWILIO_PHONE_NUMBER;

      const { isTwilioConfigured } = await import('@/lib/twilio/client');

      expect(isTwilioConfigured()).toBe(false);
    });

    it('should return false when all credentials are empty strings', async () => {
      process.env.TWILIO_ACCOUNT_SID = '';
      process.env.TWILIO_AUTH_TOKEN = '';
      process.env.TWILIO_PHONE_NUMBER = '';

      const { isTwilioConfigured } = await import('@/lib/twilio/client');

      expect(isTwilioConfigured()).toBe(false);
    });
  });
});
