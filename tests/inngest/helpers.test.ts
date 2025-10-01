/**
 * Tests for Inngest database helpers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies FIRST (hoisted to top)
vi.mock('@/lib/db');

import {
  createMessageSend,
  updateMessageSendStatus,
  getMessageTemplate,
  checkConsent,
  incrementReminderCount,
  getRegistrationWithContact,
} from '@/lib/inngest/helpers';

describe('Inngest Helpers', () => {
  describe('createMessageSend', () => {
    it.skip('should create a message send record', async () => {
      const { db } = await import('@/lib/db');
      const mockDb = db as any;

      mockDb.from().insert().select().single.mockResolvedValue({
        data: {
          id: 'msg-123',
          registration_id: 'reg-123',
          template_id: 'tpl-welcome',
          channel: 'email',
          status: 'pending',
        },
        error: null,
      });

      const result = await createMessageSend({
        registrationId: 'reg-123',
        templateId: 'tpl-welcome',
        channel: 'email',
        scheduledFor: new Date(),
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('msg-123');
      expect(mockDb.from).toHaveBeenCalledWith('message_sends');
    });

    it.skip('should handle database errors', async () => {
      const { db } = await import('@/lib/db');
      const mockDb = db as any;

      mockDb.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        createMessageSend({
          registrationId: 'reg-123',
          templateId: 'tpl-welcome',
          channel: 'email',
          scheduledFor: new Date(),
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('updateMessageSendStatus', () => {
    it.skip('should update message send status', async () => {
      const { db } = await import('@/lib/db');
      const mockDb = db as any;

      mockDb.from().update().eq().select().single.mockResolvedValue({
        data: {
          id: 'msg-123',
          status: 'sent',
          sent_at: new Date().toISOString(),
        },
        error: null,
      });

      const result = await updateMessageSendStatus('msg-123', 'sent', {
        sentAt: new Date(),
        externalId: 'ext-123',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('sent');
    });
  });

  describe('getMessageTemplate', () => {
    it.skip('should retrieve a message template', async () => {
      const { db } = await import('@/lib/db');
      const mockDb = db as any;

      mockDb.__setMockData('campaign_messages', [
        {
          template_id: 'tpl-welcome',
          subject: 'Welcome!',
          body: 'Hello {{firstName}}',
          channel: 'email',
        },
      ]);

      const template = await getMessageTemplate('tpl-welcome');

      expect(template).toBeDefined();
      expect(template?.template_id).toBe('tpl-welcome');
    });

    it.skip('should return null for non-existent template', async () => {
      const { db } = await import('@/lib/db');
      const mockDb = db as any;

      mockDb.__setMockData('campaign_messages', []);

      const template = await getMessageTemplate('non-existent');

      expect(template).toBeNull();
    });
  });

  describe('checkConsent', () => {
    it.skip('should return true when email consent is granted', async () => {
      const { db } = await import('@/lib/db');
      const mockDb = db as any;

      mockDb.__setMockData('contacts', [
        {
          id: 'contact-123',
          email_consent: true,
          sms_consent: false,
        },
      ]);

      const hasConsent = await checkConsent('contact-123', 'email');

      expect(hasConsent).toBe(true);
    });

    it.skip('should return false when SMS consent is not granted', async () => {
      const { db } = await import('@/lib/db');
      const mockDb = db as any;

      mockDb.__setMockData('contacts', [
        {
          id: 'contact-123',
          email_consent: true,
          sms_consent: false,
        },
      ]);

      const hasConsent = await checkConsent('contact-123', 'sms');

      expect(hasConsent).toBe(false);
    });
  });

  describe('incrementReminderCount', () => {
    it.skip('should increment reminder count on registration', async () => {
      const { db } = await import('@/lib/db');
      const mockDb = db as any;

      mockDb.from().select().eq().single.mockResolvedValue({
        data: { reminders_sent: { '24h': 1, '1h': 0 } },
        error: null,
      });

      mockDb.from().update().eq().mockResolvedValue({
        data: null,
        error: null,
      });

      await incrementReminderCount('reg-123', '24h');

      expect(mockDb.from).toHaveBeenCalledWith('registrations');
    });
  });

  describe('getRegistrationWithContact', () => {
    it.skip('should retrieve registration with contact and event data', async () => {
      const { db } = await import('@/lib/db');
      const mockDb = db as any;

      const mockData = {
        id: 'reg-123',
        contact_id: 'contact-123',
        event_id: 'event-123',
        contacts: {
          id: 'contact-123',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
        },
        events: {
          id: 'event-123',
          title: 'Test Event',
          scheduled_at: '2025-10-01T10:00:00Z',
          status: 'scheduled',
        },
      };

      mockDb.__setMockData('registrations', [mockData]);

      const result = await getRegistrationWithContact('reg-123');

      expect(result).toBeDefined();
      expect(result?.contacts.email).toBe('test@example.com');
      expect(result?.events.title).toBe('Test Event');
    });

    it.skip('should return null for non-existent registration', async () => {
      const { db } = await import('@/lib/db');
      const mockDb = db as any;

      mockDb.__setMockData('registrations', []);

      const result = await getRegistrationWithContact('non-existent');

      expect(result).toBeNull();
    });
  });
});
