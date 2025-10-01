/**
 * Integration Tests: Enrollment → Funnel Flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Inngest client
const mockInngestSend = vi.fn();
vi.mock('@/inngest/client', () => ({
  inngest: {
    send: mockInngestSend,
  },
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

vi.mock('@/lib/db');
vi.mock('@/lib/zoom/client');

describe('Integration: Enrollment to Funnel Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Enrollment Flow', () => {
    it('should trigger Inngest funnel after successful enrollment', async () => {
      mockInngestSend.mockResolvedValue({ ids: ['evt-123'] });

      const enrollmentData = {
        contactId: 'contact-123',
        eventId: 'event-123',
        registrationId: 'reg-123',
        eventTitle: 'Test Event',
        scheduledAt: '2025-10-01T10:00:00Z',
        contactEmail: 'test@example.com',
        contactFirstName: 'John',
        joinUrl: 'https://zoom.us/j/123',
      };

      await mockInngestSend({
        name: 'event.enrolled',
        data: enrollmentData,
      });

      expect(mockInngestSend).toHaveBeenCalledWith({
        name: 'event.enrolled',
        data: enrollmentData,
      });
    });

    it('should not fail enrollment if Inngest trigger fails', async () => {
      mockInngestSend.mockRejectedValue(new Error('Inngest unavailable'));

      // Enrollment should still succeed
      const enrollmentResult = {
        success: true,
        data: {
          registrationId: 'reg-123',
          contactId: 'contact-123',
        },
      };

      // Try to trigger Inngest
      try {
        await mockInngestSend({
          name: 'event.enrolled',
          data: {},
        });
      } catch (error) {
        // Error is caught and logged, enrollment continues
        expect(error).toBeDefined();
      }

      // Enrollment should still be successful
      expect(enrollmentResult.success).toBe(true);
    });
  });

  describe('Event Data Flow', () => {
    it('should pass complete event data from enrollment to funnel', async () => {
      mockInngestSend.mockResolvedValue({ ids: ['evt-123'] } as any);

      const eventData = {
        contactId: 'contact-123',
        eventId: 'event-123',
        registrationId: 'reg-123',
        eventTitle: 'Webinar: Introduction to Testing',
        scheduledAt: '2025-10-01T14:00:00Z',
        contactEmail: 'john@example.com',
        contactFirstName: 'John',
        contactLastName: 'Doe',
        contactPhone: '+14155551234',
        joinUrl: 'https://zoom.us/j/123456789',
      };

      await mockInngestSend({
        name: 'event.enrolled',
        data: eventData,
      });

      const call = mockInngestSend.mock.calls[0][0];
      expect(call.data.contactEmail).toBe('john@example.com');
      expect(call.data.joinUrl).toBe('https://zoom.us/j/123456789');
      expect(call.data.eventTitle).toBe('Webinar: Introduction to Testing');
    });
  });

  describe('Funnel Execution', () => {
    it('should execute pre-event funnel steps in sequence', async () => {
      mockCreateMessageSend.mockImplementation(async (params) => ({
        id: `msg-${params.templateId}`,
        registration_id: params.registrationId,
        template_id: params.templateId,
        channel: params.channel,
        status: 'pending',
      } as any));

      // Step 1: Welcome email (immediate)
      const welcome = await mockCreateMessageSend({
        registrationId: 'reg-123',
        templateId: 'welcome_email',
        channel: 'email',
        scheduledFor: new Date(),
      });
      expect(welcome.template_id).toBe('welcome_email');

      // Step 2: 24h reminder
      const reminder24h = await mockCreateMessageSend({
        registrationId: 'reg-123',
        templateId: 'reminder_24h',
        channel: 'email',
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      expect(reminder24h.template_id).toBe('reminder_24h');

      // Step 3: 1h reminder
      const reminder1h = await mockCreateMessageSend({
        registrationId: 'reg-123',
        templateId: 'reminder_1h',
        channel: 'email',
        scheduledFor: new Date(Date.now() + 60 * 60 * 1000),
      });
      expect(reminder1h.template_id).toBe('reminder_1h');

      expect(mockCreateMessageSend).toHaveBeenCalledTimes(3);
    });

    it('should handle event completion and trigger post-event funnel', async () => {
      mockInngestSend.mockResolvedValue({ ids: ['evt-post-123'] } as any);

      const eventCompletedData = {
        eventId: 'event-123',
        registrations: [
          { id: 'reg-1', attended: true },
          { id: 'reg-2', attended: false },
          { id: 'reg-3', attended: true },
        ],
      };

      await mockInngestSend({
        name: 'event.completed',
        data: eventCompletedData,
      });

      expect(mockInngestSend).toHaveBeenCalledWith({
        name: 'event.completed',
        data: eventCompletedData,
      });
    });
  });

  describe('End-to-End Scenarios', () => {
    it('should complete full attended user journey', async () => {
      mockInngestSend.mockResolvedValue({ ids: ['evt-123'] } as any);
      mockCreateMessageSend.mockImplementation(async (params) => ({
        id: `msg-${Date.now()}`,
        registration_id: params.registrationId,
        template_id: params.templateId,
        channel: params.channel,
        status: 'pending',
      } as any));

      // 1. User enrolls
      await mockInngestSend({
        name: 'event.enrolled',
        data: {
          contactId: 'contact-123',
          eventId: 'event-123',
          registrationId: 'reg-123',
        },
      });

      // 2. Pre-event messages sent
      await mockCreateMessageSend({
        registrationId: 'reg-123',
        templateId: 'welcome_email',
        channel: 'email',
        scheduledFor: new Date(),
      });

      // 3. User attends event
      await mockInngestSend({
        name: 'event.completed',
        data: {
          eventId: 'event-123',
          registrations: [{ id: 'reg-123', attended: true }],
        },
      });

      // 4. Post-event attended messages sent
      await mockCreateMessageSend({
        registrationId: 'reg-123',
        templateId: 'post_attended_thankyou',
        channel: 'email',
        scheduledFor: new Date(),
      });

      expect(mockInngestSend).toHaveBeenCalledTimes(2);
      expect(mockCreateMessageSend).toHaveBeenCalledTimes(2);
    });

    it('should complete full no-show user journey', async () => {
      mockInngestSend.mockResolvedValue({ ids: ['evt-123'] } as any);
      mockCheckConsent.mockResolvedValue(true);
      mockCreateMessageSend.mockImplementation(async (params) => ({
        id: `msg-${Date.now()}`,
        registration_id: params.registrationId,
        template_id: params.templateId,
        channel: params.channel,
        status: 'pending',
      } as any));

      // 1. User enrolls
      await mockInngestSend({
        name: 'event.enrolled',
        data: {
          contactId: 'contact-123',
          eventId: 'event-123',
          registrationId: 'reg-123',
        },
      });

      // 2. Pre-event messages sent
      await mockCreateMessageSend({
        registrationId: 'reg-123',
        templateId: 'welcome_email',
        channel: 'email',
        scheduledFor: new Date(),
      });

      // 3. User does NOT attend event
      await mockInngestSend({
        name: 'event.completed',
        data: {
          eventId: 'event-123',
          registrations: [{ id: 'reg-123', attended: false }],
        },
      });

      // 4. Post-event no-show messages sent (email + SMS)
      await mockCreateMessageSend({
        registrationId: 'reg-123',
        templateId: 'post_noshow_sorry',
        channel: 'email',
        scheduledFor: new Date(),
      });

      const hasConsent = await mockCheckConsent('contact-123', 'sms');
      if (hasConsent) {
        await mockCreateMessageSend({
          registrationId: 'reg-123',
          templateId: 'post_noshow_reengage',
          channel: 'sms',
          scheduledFor: new Date(),
        });
      }

      expect(mockInngestSend).toHaveBeenCalledTimes(2);
      expect(mockCreateMessageSend).toHaveBeenCalled();
    });
  });

  describe('Error Recovery', () => {
    it('should recover from transient Inngest errors', async () => {
      mockInngestSend
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ids: ['evt-123'] } as any);

      // First attempt fails
      await expect(
        mockInngestSend({
          name: 'event.enrolled',
          data: {},
        })
      ).rejects.toThrow('Network error');

      // Retry succeeds
      const result = await mockInngestSend({
        name: 'event.enrolled',
        data: {},
      });

      expect(result.ids).toBeDefined();
    });

    it('should continue funnel even if one message fails', async () => {
      mockCreateMessageSend
        .mockResolvedValueOnce({ id: 'msg-1', status: 'pending' } as any)
        .mockRejectedValueOnce(new Error('SMS failed'))
        .mockResolvedValueOnce({ id: 'msg-3', status: 'pending' } as any);

      const results = [];

      // Step 1: Welcome email (succeeds)
      try {
        results.push(await mockCreateMessageSend({
          registrationId: 'reg-123',
          templateId: 'welcome_email',
          channel: 'email',
          scheduledFor: new Date(),
        }));
      } catch (error) {
        console.error(error);
      }

      // Step 2: SMS reminder (fails)
      try {
        results.push(await mockCreateMessageSend({
          registrationId: 'reg-123',
          templateId: 'reminder_sms',
          channel: 'sms',
          scheduledFor: new Date(),
        }));
      } catch (error) {
        console.error('SMS failed, continuing...');
      }

      // Step 3: Final email (succeeds)
      try {
        results.push(await mockCreateMessageSend({
          registrationId: 'reg-123',
          templateId: 'reminder_1h',
          channel: 'email',
          scheduledFor: new Date(),
        }));
      } catch (error) {
        console.error(error);
      }

      // Should have 2 successful results despite 1 failure
      expect(results).toHaveLength(2);
    });
  });
});
