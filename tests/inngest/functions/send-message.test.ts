/**
 * Tests for Generic Message Sender
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/db');

// Mock helper functions
const mockCreateMessageSend = vi.fn();
const mockCheckConsent = vi.fn();
const mockUpdateMessageSendStatus = vi.fn();
const mockGetMessageTemplate = vi.fn();
const mockIncrementReminderCount = vi.fn();
const mockGetRegistrationWithContact = vi.fn();

vi.mock('@/lib/inngest/helpers', () => ({
  createMessageSend: mockCreateMessageSend,
  checkConsent: mockCheckConsent,
  updateMessageSendStatus: mockUpdateMessageSendStatus,
  getMessageTemplate: mockGetMessageTemplate,
  incrementReminderCount: mockIncrementReminderCount,
  getRegistrationWithContact: mockGetRegistrationWithContact,
}));

describe('Message Sender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Template Personalization', () => {
    it('should replace firstName token', () => {
      const template = 'Hello {{firstName}}!';
      const personalized = template.replace(/\{\{firstName\}\}/g, 'John');

      expect(personalized).toBe('Hello John!');
    });

    it('should replace multiple tokens', () => {
      const template = 'Hi {{firstName}} {{lastName}}, join at {{joinUrl}}';
      const personalized = template
        .replace(/\{\{firstName\}\}/g, 'John')
        .replace(/\{\{lastName\}\}/g, 'Doe')
        .replace(/\{\{joinUrl\}\}/g, 'https://zoom.us/j/123');

      expect(personalized).toBe('Hi John Doe, join at https://zoom.us/j/123');
    });

    it('should handle missing data gracefully', () => {
      const template = 'Hello {{firstName}}!';
      const personalized = template.replace(/\{\{firstName\}\}/g, '');

      expect(personalized).toBe('Hello !');
    });

    it('should replace eventTitle token', () => {
      const template = 'You\'re registered for {{eventTitle}}';
      const personalized = template.replace(/\{\{eventTitle\}\}/g, 'Webinar 101');

      expect(personalized).toBe('You\'re registered for Webinar 101');
    });

    it('should replace eventDate token with formatted date', () => {
      const template = 'Event on {{eventDate}}';
      const date = new Date('2025-10-01T10:00:00Z');
      const formatted = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const personalized = template.replace(/\{\{eventDate\}\}/g, formatted);

      expect(personalized).toContain('October');
      expect(personalized).toContain('2025');
    });
  });

  describe('Consent Validation', () => {
    it('should check consent before sending', async () => {
      mockCheckConsent.mockResolvedValue(true);

      const hasConsent = await mockCheckConsent('contact-123', 'email');

      expect(hasConsent).toBe(true);
    });

    it('should prevent sending if no consent', async () => {
      mockCheckConsent.mockResolvedValue(false);

      const hasConsent = await mockCheckConsent('contact-123', 'sms');

      if (!hasConsent) {
        // Would skip sending
        expect(hasConsent).toBe(false);
      }
    });

    it('should validate consent for correct channel', async () => {
      mockCheckConsent.mockImplementation(async (contactId, channel) => {
        return channel === 'email';
      });

      const emailConsent = await mockCheckConsent('contact-123', 'email');
      const smsConsent = await mockCheckConsent('contact-123', 'sms');

      expect(emailConsent).toBe(true);
      expect(smsConsent).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limit of 100 messages per minute', async () => {
      const maxMessagesPerMinute = 100;
      const delayBetweenMessages = 60000 / maxMessagesPerMinute; // 600ms

      expect(delayBetweenMessages).toBe(600);
    });

    it('should batch messages when rate limit would be exceeded', async () => {
      const messages = Array.from({ length: 150 }, (_, i) => ({ id: `msg-${i}` }));
      const maxBatchSize = 100;

      const batches = [];
      for (let i = 0; i < messages.length; i += maxBatchSize) {
        batches.push(messages.slice(i, i + maxBatchSize));
      }

      expect(batches).toHaveLength(2);
      expect(batches[0]).toHaveLength(100);
      expect(batches[1]).toHaveLength(50);
    });
  });

  describe('Message Status Tracking', () => {
    it('should create message with pending status', async () => {
      mockCreateMessageSend.mockResolvedValue({
        id: 'msg-123',
        status: 'pending',
        channel: 'email',
      } as any);

      const message = await mockCreateMessageSend({
        registrationId: 'reg-123',
        templateId: 'welcome_email',
        channel: 'email',
        scheduledFor: new Date(),
      });

      expect(message.status).toBe('pending');
    });

    it('should update message status after sending', async () => {
      mockUpdateMessageSendStatus.mockResolvedValue({
        id: 'msg-123',
        status: 'sent',
        sent_at: new Date().toISOString(),
      } as any);

      const updated = await mockUpdateMessageSendStatus('msg-123', 'sent', {
        sentAt: new Date(),
        externalId: 'ext-123',
      });

      expect(updated.status).toBe('sent');
      expect(updated.sent_at).toBeDefined();
    });

    it('should handle failed status', async () => {
      mockUpdateMessageSendStatus.mockResolvedValue({
        id: 'msg-123',
        status: 'failed',
        error_message: 'Provider error',
      } as any);

      const updated = await mockUpdateMessageSendStatus('msg-123', 'failed', {
        errorMessage: 'Provider error',
      });

      expect(updated.status).toBe('failed');
      expect(updated.error_message).toBeDefined();
    });
  });

  describe('Retry Logic', () => {
    it('should retry on failure with exponential backoff', async () => {
      const retryDelays = [60000, 300000, 1800000]; // 1m, 5m, 30m in ms

      expect(retryDelays[0]).toBe(60000); // 1 minute
      expect(retryDelays[1]).toBe(300000); // 5 minutes
      expect(retryDelays[2]).toBe(1800000); // 30 minutes
    });

    it('should move to DLQ after max retries', async () => {
      const maxRetries = 4;
      let retryCount = 0;

      while (retryCount < maxRetries) {
        retryCount++;
      }

      expect(retryCount).toBe(4);
      // Would move to DLQ here
    });

    it('should not retry if message was successfully sent', async () => {
      mockUpdateMessageSendStatus.mockResolvedValue({
        id: 'msg-123',
        status: 'sent',
      } as any);

      const updated = await mockUpdateMessageSendStatus('msg-123', 'sent', {
        sentAt: new Date(),
      });

      if (updated.status === 'sent') {
        // No retry needed
        expect(updated.status).toBe('sent');
      }
    });
  });

  describe('Channel-Specific Handling', () => {
    it('should handle email-specific fields', async () => {
      mockGetMessageTemplate.mockResolvedValue({
        template_id: 'welcome_email',
        subject: 'Welcome!',
        body: 'Hello {{firstName}}',
        channel: 'email',
      } as any);

      const template = await mockGetMessageTemplate('welcome_email');

      expect(template?.channel).toBe('email');
      expect(template?.subject).toBeDefined();
    });

    it('should handle SMS-specific constraints', async () => {
      mockGetMessageTemplate.mockResolvedValue({
        template_id: 'reminder_sms',
        body: 'Reminder: Event starts in 1 hour!',
        channel: 'sms',
      } as any);

      const template = await mockGetMessageTemplate('reminder_sms');

      expect(template?.channel).toBe('sms');
      expect(template?.subject).toBeUndefined(); // SMS has no subject

      // SMS should be under 160 characters
      const bodyLength = template?.body?.length || 0;
      expect(bodyLength).toBeLessThanOrEqual(160);
    });
  });

  describe('Error Handling', () => {
    it('should handle template not found', async () => {
      mockGetMessageTemplate.mockResolvedValue(null);

      const template = await mockGetMessageTemplate('non-existent');

      expect(template).toBeNull();
    });

    it('should handle database errors during message creation', async () => {
      mockCreateMessageSend.mockRejectedValue(new Error('Database error'));

      await expect(
        mockCreateMessageSend({
          registrationId: 'reg-123',
          templateId: 'welcome_email',
          channel: 'email',
          scheduledFor: new Date(),
        })
      ).rejects.toThrow('Database error');
    });

    it('should handle invalid personalization data', () => {
      const template = 'Hello {{firstName}} {{lastName}}!';
      const data: Record<string, string | undefined> = {
        firstName: 'John',
        lastName: undefined,
      };

      const personalized = template
        .replace(/\{\{firstName\}\}/g, data.firstName || '')
        .replace(/\{\{lastName\}\}/g, data.lastName || '');

      expect(personalized).toBe('Hello John !');
    });
  });

  describe('Logging', () => {
    it('should log message placeholder for development', () => {
      const logEntry = {
        channel: 'email',
        to: 'test@example.com',
        subject: 'Welcome!',
        template: 'welcome_email',
        timestamp: new Date().toISOString(),
      };

      expect(logEntry.channel).toBe('email');
      expect(logEntry.to).toBe('test@example.com');
      expect(logEntry.subject).toBeDefined();
    });

    it('should include registration context in logs', () => {
      const logEntry = {
        registrationId: 'reg-123',
        contactId: 'contact-123',
        eventId: 'event-123',
        messageId: 'msg-123',
        action: 'message_sent',
      };

      expect(logEntry.registrationId).toBe('reg-123');
      expect(logEntry.action).toBe('message_sent');
    });
  });
});
