/**
 * Tests for Resend Client Configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Resend to prevent errors when API key is missing
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation((apiKey?: string) => {
    if (!apiKey) {
      console.error(
        '[Resend] RESEND_API_KEY environment variable is not set. Email sending will fail.'
      );
      console.error('[Resend] Get your API key from https://resend.com/api-keys');
    }
    return {
      emails: {
        send: vi.fn(),
      },
    };
  }),
}));

describe('Resend Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Client Initialization', () => {
    it('should create Resend client with API key from environment', async () => {
      process.env.RESEND_API_KEY = 're_test123';

      const { resend } = await import('@/lib/resend/client');

      expect(resend).toBeDefined();
    });

    it('should create Resend client even when API key is not set', async () => {
      delete process.env.RESEND_API_KEY;

      const { resend } = await import('@/lib/resend/client');

      expect(resend).toBeDefined();
    });
  });

  describe('Default Configuration', () => {
    it('should use default FROM email when RESEND_FROM_EMAIL is not set', async () => {
      process.env.RESEND_API_KEY = 're_test123';
      delete process.env.RESEND_FROM_EMAIL;
      delete process.env.RESEND_FROM_NAME;

      const { DEFAULT_FROM_EMAIL, DEFAULT_FROM_NAME, DEFAULT_FROM } =
        await import('@/lib/resend/client');

      expect(DEFAULT_FROM_EMAIL).toBe('noreply@ceremonia.com');
      expect(DEFAULT_FROM_NAME).toBe('Ceremonia');
      expect(DEFAULT_FROM).toBe('Ceremonia <noreply@ceremonia.com>');
    });

    it('should use environment FROM email when RESEND_FROM_EMAIL is set', async () => {
      process.env.RESEND_API_KEY = 're_test123';
      process.env.RESEND_FROM_EMAIL = 'custom@example.com';
      process.env.RESEND_FROM_NAME = 'Custom Name';

      const { DEFAULT_FROM_EMAIL, DEFAULT_FROM_NAME, DEFAULT_FROM } =
        await import('@/lib/resend/client');

      expect(DEFAULT_FROM_EMAIL).toBe('custom@example.com');
      expect(DEFAULT_FROM_NAME).toBe('Custom Name');
      expect(DEFAULT_FROM).toBe('Custom Name <custom@example.com>');
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should export rate limit constants', async () => {
      process.env.RESEND_API_KEY = 're_test123';

      const { RATE_LIMIT_PER_MINUTE, RATE_LIMIT_PER_SECOND } =
        await import('@/lib/resend/client');

      expect(RATE_LIMIT_PER_MINUTE).toBe(100);
      expect(RATE_LIMIT_PER_SECOND).toBe(10);
    });
  });

  describe('isResendConfigured', () => {
    it('should return true when RESEND_API_KEY is set', async () => {
      process.env.RESEND_API_KEY = 're_test123';

      const { isResendConfigured } = await import('@/lib/resend/client');

      expect(isResendConfigured()).toBe(true);
    });

    it('should return false when RESEND_API_KEY is not set', async () => {
      delete process.env.RESEND_API_KEY;

      const { isResendConfigured } = await import('@/lib/resend/client');

      expect(isResendConfigured()).toBe(false);
    });

    it('should return false when RESEND_API_KEY is empty string', async () => {
      process.env.RESEND_API_KEY = '';

      const { isResendConfigured } = await import('@/lib/resend/client');

      expect(isResendConfigured()).toBe(false);
    });
  });
});
