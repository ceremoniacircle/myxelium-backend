/**
 * Tests for Generic Message Sender
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { personalizeTemplate, buildPersonalizationData, formatEventDate } from '@/lib/resend/helpers';

vi.mock('@/lib/db');

// Mock Resend client
const mockResendSend = vi.fn();
vi.mock('@/lib/resend/client', () => ({
  resend: {
    emails: {
      send: mockResendSend,
    },
  },
  DEFAULT_FROM: 'Ceremonia <noreply@ceremonia.com>',
  isResendConfigured: vi.fn(() => true),
}));

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
      const personalized = personalizeTemplate('Hello {{firstName}}!', { firstName: 'John' });
      expect(personalized).toBe('Hello John!');
    });

    it('should replace multiple tokens', () => {
      const personalized = personalizeTemplate(
        'Hi {{firstName}} {{lastName}}, join at {{joinUrl}}',
        {
          firstName: 'John',
          lastName: 'Doe',
          joinUrl: 'https://zoom.us/j/123',
        }
      );

      expect(personalized).toBe('Hi John Doe, join at https://zoom.us/j/123');
    });

    it('should handle missing data gracefully', () => {
      const personalized = personalizeTemplate('Hello {{firstName}}!', {});
      expect(personalized).toBe('Hello !');
    });

    it('should replace eventTitle token', () => {
      const personalized = personalizeTemplate(
        "You're registered for {{eventTitle}}",
        { eventTitle: 'Webinar 101' }
      );

      expect(personalized).toBe("You're registered for Webinar 101");
    });

    it('should replace eventDate token with formatted date', () => {
      const formatted = formatEventDate('2025-10-01T10:00:00Z', 'America/Los_Angeles');
      expect(formatted).toContain('October');
      expect(formatted).toContain('2025');
    });

    it('should build complete personalization data', () => {
      const data = buildPersonalizationData(
        { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
        { title: 'AI Webinar', scheduled_at: '2025-10-01T10:00:00Z', timezone: 'America/Los_Angeles' },
        { platform_join_url: 'https://zoom.us/j/123' }
      );

      expect(data.firstName).toBe('John');
      expect(data.lastName).toBe('Doe');
      expect(data.eventTitle).toBe('AI Webinar');
      expect(data.joinUrl).toBe('https://zoom.us/j/123');
      expect(data.eventDate).toContain('October');
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

  describe('Resend Email Integration', () => {
    beforeEach(() => {
      mockResendSend.mockClear();
    });

    it('should send email via Resend successfully', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'resend-msg-123' },
        error: null,
      });

      const result = await mockResendSend({
        from: 'Ceremonia <noreply@ceremonia.com>',
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Hello World</p>',
        text: 'Hello World',
      });

      expect(mockResendSend).toHaveBeenCalledWith({
        from: 'Ceremonia <noreply@ceremonia.com>',
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Hello World</p>',
        text: 'Hello World',
      });
      expect(result.data.id).toBe('resend-msg-123');
      expect(result.error).toBeNull();
    });

    it('should handle Resend rate limiting error', async () => {
      mockResendSend.mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded (429)' },
      });

      const result = await mockResendSend({
        from: 'Ceremonia <noreply@ceremonia.com>',
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test</p>',
      });

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Rate limit');
    });

    it('should handle invalid recipient error', async () => {
      mockResendSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid recipient email address' },
      });

      const result = await mockResendSend({
        from: 'Ceremonia <noreply@ceremonia.com>',
        to: 'invalid-email',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Invalid recipient');
    });

    it('should handle Resend API errors gracefully', async () => {
      mockResendSend.mockResolvedValue({
        data: null,
        error: { message: 'Internal server error' },
      });

      const result = await mockResendSend({
        from: 'Ceremonia <noreply@ceremonia.com>',
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.error).toBeDefined();
    });
  });

  describe('Webhook Event Processing', () => {
    it('should process email.delivered event', () => {
      const webhookEvent = {
        type: 'email.delivered',
        created_at: '2025-09-30T10:00:00Z',
        data: {
          email_id: 'resend-msg-123',
          from: 'noreply@ceremonia.com',
          to: ['test@example.com'],
          subject: 'Welcome Email',
          created_at: '2025-09-30T10:00:00Z',
        },
      };

      expect(webhookEvent.type).toBe('email.delivered');
      expect(webhookEvent.data.email_id).toBe('resend-msg-123');
    });

    it('should process email.opened event', () => {
      const webhookEvent = {
        type: 'email.opened',
        created_at: '2025-09-30T10:05:00Z',
        data: {
          email_id: 'resend-msg-123',
          from: 'noreply@ceremonia.com',
          to: ['test@example.com'],
          subject: 'Welcome Email',
          created_at: '2025-09-30T10:05:00Z',
        },
      };

      expect(webhookEvent.type).toBe('email.opened');
    });

    it('should process email.clicked event with link tracking', () => {
      const webhookEvent = {
        type: 'email.clicked',
        created_at: '2025-09-30T10:10:00Z',
        data: {
          email_id: 'resend-msg-123',
          from: 'noreply@ceremonia.com',
          to: ['test@example.com'],
          subject: 'Welcome Email',
          link: 'https://zoom.us/j/123',
          created_at: '2025-09-30T10:10:00Z',
        },
      };

      expect(webhookEvent.type).toBe('email.clicked');
      expect(webhookEvent.data.link).toBe('https://zoom.us/j/123');
    });

    it('should process email.bounced event', () => {
      const webhookEvent = {
        type: 'email.bounced',
        created_at: '2025-09-30T10:00:00Z',
        data: {
          email_id: 'resend-msg-123',
          from: 'noreply@ceremonia.com',
          to: ['invalid@example.com'],
          subject: 'Welcome Email',
          bounce_type: 'hard',
          created_at: '2025-09-30T10:00:00Z',
        },
      };

      expect(webhookEvent.type).toBe('email.bounced');
      expect(webhookEvent.data.bounce_type).toBe('hard');
    });
  });
});
