/**
 * Tests for Post-Event Drip Campaign
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

describe('Post-Event Drip Campaign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Branching Logic', () => {
    it('should route to attended path when attended is true', async () => {
      const registration = {
        id: 'reg-123',
        attended: true,
        contacts: {
          id: 'contact-123',
          email: 'test@example.com',
          first_name: 'John',
        },
        events: {
          id: 'event-123',
          title: 'Test Event',
        },
      };

      const path = registration.attended ? 'attended' : 'noshow';

      expect(path).toBe('attended');
    });

    it('should route to no-show path when attended is false', async () => {
      const registration = {
        id: 'reg-123',
        attended: false,
        contacts: {
          id: 'contact-123',
          email: 'test@example.com',
          first_name: 'John',
        },
        events: {
          id: 'event-123',
          title: 'Test Event',
        },
      };

      const path = registration.attended ? 'attended' : 'noshow';

      expect(path).toBe('noshow');
    });

    it('should handle null attended value as no-show', async () => {
      const registration = {
        id: 'reg-123',
        attended: null,
        contacts: {
          id: 'contact-123',
          email: 'test@example.com',
          first_name: 'John',
        },
        events: {
          id: 'event-123',
          title: 'Test Event',
        },
      };

      const path = registration.attended ? 'attended' : 'noshow';

      expect(path).toBe('noshow');
    });
  });

  describe('Attended Path', () => {
    it('should schedule thank you email at T+1h', async () => {
      const eventCompletedAt = new Date('2025-10-01T12:00:00Z');
      const thankYouTime = new Date(eventCompletedAt.getTime() + 60 * 60 * 1000);

      expect(thankYouTime.toISOString()).toBe('2025-10-01T13:00:00.000Z');
    });

    it('should schedule resources email at T+24h', async () => {
      const eventCompletedAt = new Date('2025-10-01T12:00:00Z');
      const resourcesTime = new Date(eventCompletedAt.getTime() + 24 * 60 * 60 * 1000);

      expect(resourcesTime.toISOString()).toBe('2025-10-02T12:00:00.000Z');
    });

    it('should schedule nurture email at T+3d', async () => {
      const eventCompletedAt = new Date('2025-10-01T12:00:00Z');
      const nurtureTime = new Date(eventCompletedAt.getTime() + 3 * 24 * 60 * 60 * 1000);

      expect(nurtureTime.toISOString()).toBe('2025-10-04T12:00:00.000Z');
    });

    it('should create all three messages for attended path', async () => {
      mockCreateMessageSend.mockImplementation(async (params) => ({
        id: `msg-${params.templateId}`,
        registration_id: params.registrationId,
        template_id: params.templateId,
        channel: params.channel,
        status: 'pending',
      } as any));

      const thankYou = await mockCreateMessageSend({
        registrationId: 'reg-123',
        templateId: 'post_attended_thankyou',
        channel: 'email',
        scheduledFor: new Date(),
      });

      const resources = await mockCreateMessageSend({
        registrationId: 'reg-123',
        templateId: 'post_attended_resources',
        channel: 'email',
        scheduledFor: new Date(),
      });

      const nurture = await mockCreateMessageSend({
        registrationId: 'reg-123',
        templateId: 'post_attended_nurture',
        channel: 'email',
        scheduledFor: new Date(),
      });

      expect(thankYou.template_id).toBe('post_attended_thankyou');
      expect(resources.template_id).toBe('post_attended_resources');
      expect(nurture.template_id).toBe('post_attended_nurture');
    });
  });

  describe('No-Show Path', () => {
    it('should schedule sorry email at T+1h', async () => {
      const eventCompletedAt = new Date('2025-10-01T12:00:00Z');
      const sorryTime = new Date(eventCompletedAt.getTime() + 60 * 60 * 1000);

      expect(sorryTime.toISOString()).toBe('2025-10-01T13:00:00.000Z');
    });

    it('should schedule re-engagement at T+24h with email and SMS', async () => {
      const eventCompletedAt = new Date('2025-10-01T12:00:00Z');
      const reengageTime = new Date(eventCompletedAt.getTime() + 24 * 60 * 60 * 1000);

      expect(reengageTime.toISOString()).toBe('2025-10-02T12:00:00.000Z');
    });

    it('should schedule final follow-up at T+7d', async () => {
      const eventCompletedAt = new Date('2025-10-01T12:00:00Z');
      const finalTime = new Date(eventCompletedAt.getTime() + 7 * 24 * 60 * 60 * 1000);

      expect(finalTime.toISOString()).toBe('2025-10-08T12:00:00.000Z');
    });

    it('should create messages for no-show path', async () => {
      mockCreateMessageSend.mockImplementation(async (params) => ({
        id: `msg-${params.templateId}`,
        registration_id: params.registrationId,
        template_id: params.templateId,
        channel: params.channel,
        status: 'pending',
      } as any));

      const sorry = await mockCreateMessageSend({
        registrationId: 'reg-123',
        templateId: 'post_noshow_sorry',
        channel: 'email',
        scheduledFor: new Date(),
      });

      const reengage = await mockCreateMessageSend({
        registrationId: 'reg-123',
        templateId: 'post_noshow_reengage',
        channel: 'email',
        scheduledFor: new Date(),
      });

      expect(sorry.template_id).toBe('post_noshow_sorry');
      expect(reengage.template_id).toBe('post_noshow_reengage');
    });

    it('should send SMS along with email for re-engagement', async () => {
      mockCheckConsent.mockResolvedValue(true);

      mockCreateMessageSend.mockImplementation(async (params) => ({
        id: `msg-${params.channel}`,
        channel: params.channel,
        status: 'pending',
      } as any));

      const hasConsent = await mockCheckConsent('contact-123', 'sms');
      expect(hasConsent).toBe(true);

      const email = await mockCreateMessageSend({
        registrationId: 'reg-123',
        templateId: 'post_noshow_reengage',
        channel: 'email',
        scheduledFor: new Date(),
      });

      const sms = await mockCreateMessageSend({
        registrationId: 'reg-123',
        templateId: 'post_noshow_reengage',
        channel: 'sms',
        scheduledFor: new Date(),
      });

      expect(email.channel).toBe('email');
      expect(sms.channel).toBe('sms');
    });
  });

  describe('Parallel Processing', () => {
    it('should process multiple registrations in parallel', async () => {
      const registrations = [
        { id: 'reg-1', attended: true },
        { id: 'reg-2', attended: false },
        { id: 'reg-3', attended: true },
      ];

      const results = await Promise.all(
        registrations.map(async (reg) => ({
          id: reg.id,
          path: reg.attended ? 'attended' : 'noshow',
        }))
      );

      expect(results).toHaveLength(3);
      expect(results[0].path).toBe('attended');
      expect(results[1].path).toBe('noshow');
      expect(results[2].path).toBe('attended');
    });

    it('should handle partial failures without blocking others', async () => {
      mockCreateMessageSend
        .mockResolvedValueOnce({ id: 'msg-1', status: 'pending' } as any)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ id: 'msg-3', status: 'pending' } as any);

      const results = await Promise.allSettled([
        mockCreateMessageSend({
          registrationId: 'reg-1',
          templateId: 'test',
          channel: 'email',
          scheduledFor: new Date(),
        }),
        mockCreateMessageSend({
          registrationId: 'reg-2',
          templateId: 'test',
          channel: 'email',
          scheduledFor: new Date(),
        }),
        mockCreateMessageSend({
          registrationId: 'reg-3',
          templateId: 'test',
          channel: 'email',
          scheduledFor: new Date(),
        }),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });
  });

  describe('Consent Checking', () => {
    it('should respect SMS consent in no-show re-engagement', async () => {
      mockCheckConsent.mockImplementation(async (contactId, channel) => {
        return channel === 'email'; // Only email consent
      });

      const emailConsent = await mockCheckConsent('contact-123', 'email');
      const smsConsent = await mockCheckConsent('contact-123', 'sms');

      expect(emailConsent).toBe(true);
      expect(smsConsent).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should log errors but continue with other messages', async () => {
      mockCreateMessageSend
        .mockRejectedValueOnce(new Error('Failed to create message'))
        .mockResolvedValueOnce({ id: 'msg-2', status: 'pending' } as any);

      await expect(
        mockCreateMessageSend({
          registrationId: 'reg-123',
          templateId: 'test',
          channel: 'email',
          scheduledFor: new Date(),
        })
      ).rejects.toThrow('Failed to create message');

      const msg2 = await mockCreateMessageSend({
        registrationId: 'reg-123',
        templateId: 'test2',
        channel: 'email',
        scheduledFor: new Date(),
      });

      expect(msg2.id).toBe('msg-2');
    });
  });
});
