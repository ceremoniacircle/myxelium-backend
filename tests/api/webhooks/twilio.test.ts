/**
 * Tests for Twilio Webhook Handler
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/webhooks/twilio/route';
import { NextRequest } from 'next/server';

// Mock database
vi.mock('@/lib/db');

// Mock Twilio client
vi.mock('@/lib/twilio/client', () => ({
  twilioClient: {
    messages: {
      create: vi.fn().mockResolvedValue({ sid: 'SM_test123' }),
    },
  },
  TWILIO_PHONE_NUMBER: '+14155552671',
  isTwilioConfigured: vi.fn().mockReturnValue(true),
}));

// Mock Twilio validation
vi.mock('twilio', () => ({
  default: vi.fn(),
  validateRequest: vi.fn().mockReturnValue(true),
}));

describe('Twilio Webhook Handler', () => {
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import mocked db
    const { db } = await import('@/lib/db');
    mockDb = db as any;

    // Setup default mock responses
    mockDb.from = vi.fn(() => mockDb);
    mockDb.insert = vi.fn(() => mockDb);
    mockDb.select = vi.fn(() => mockDb);
    mockDb.update = vi.fn(() => mockDb);
    mockDb.eq = vi.fn(() => mockDb);
    mockDb.single = vi.fn(() => ({ data: null, error: null }));
    mockDb.maybeSingle = vi.fn(() => ({ data: null, error: null }));
  });

  const createMockRequest = (
    formData: Record<string, string>,
    headers: Record<string, string> = {}
  ): NextRequest => {
    const mockFormData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      mockFormData.append(key, value);
    });

    const request = {
      formData: vi.fn().mockResolvedValue(mockFormData),
      headers: new Map(Object.entries(headers)),
      url: 'https://example.com/api/webhooks/twilio',
    } as unknown as NextRequest;

    return request;
  };

  describe('Webhook Signature Verification', () => {
    it('should accept webhook when auth token is not configured', async () => {
      const originalEnv = process.env.TWILIO_AUTH_TOKEN;
      delete process.env.TWILIO_AUTH_TOKEN;

      const formData = {
        MessageSid: 'SM_test123',
        MessageStatus: 'delivered',
        To: '+14155552671',
        From: '+12125552671',
        Body: 'Test message',
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'sent_messages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'msg-123',
                      status: 'sent',
                      contact_id: 'contact-123',
                    },
                    error: null,
                  }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'activities') {
          return {
            insert: () => Promise.resolve({ error: null }),
          };
        }
        return mockDb;
      });

      const request = createMockRequest(formData);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);

      process.env.TWILIO_AUTH_TOKEN = originalEnv;
    });

    it('should reject webhook with missing signature header', async () => {
      process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';

      const formData = {
        MessageSid: 'SM_test123',
        MessageStatus: 'delivered',
        To: '+14155552671',
        From: '+12125552671',
        Body: 'Test message',
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        return mockDb;
      });

      // No signature header provided
      const request = createMockRequest(formData);
      const response = await POST(request);

      // Should reject due to missing signature
      expect(response.status).toBe(401);
    });
  });

  describe('Status Callback Handling', () => {
    beforeEach(() => {
      // Clear auth token for these tests to bypass signature verification
      delete process.env.TWILIO_AUTH_TOKEN;
    });

    it('should handle "queued" status', async () => {
      const formData = {
        MessageSid: 'SM_test123',
        MessageStatus: 'queued',
        To: '+14155552671',
        From: '+12125552671',
        Body: 'Test message',
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'sent_messages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'msg-123',
                      status: 'pending',
                      contact_id: 'contact-123',
                    },
                    error: null,
                  }),
              }),
            }),
            update: vi.fn(() => ({
              eq: () => Promise.resolve({ error: null }),
            })),
          };
        }
        return mockDb;
      });

      const request = createMockRequest(formData);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
    });

    it('should handle "sent" status', async () => {
      const formData = {
        MessageSid: 'SM_test123',
        MessageStatus: 'sent',
        To: '+14155552671',
        From: '+12125552671',
        Body: 'Test message',
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'sent_messages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'msg-123',
                      status: 'queued',
                      contact_id: 'contact-123',
                    },
                    error: null,
                  }),
              }),
            }),
            update: vi.fn(() => ({
              eq: () => Promise.resolve({ error: null }),
            })),
          };
        }
        return mockDb;
      });

      const request = createMockRequest(formData);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
    });

    it('should handle "delivered" status', async () => {
      const formData = {
        MessageSid: 'SM_test123',
        MessageStatus: 'delivered',
        To: '+14155552671',
        From: '+12125552671',
        Body: 'Test message',
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'sent_messages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'msg-123',
                      status: 'sent',
                      contact_id: 'contact-123',
                    },
                    error: null,
                  }),
              }),
            }),
            update: vi.fn(() => ({
              eq: () => Promise.resolve({ error: null }),
            })),
          };
        }
        if (table === 'activities') {
          return {
            insert: () => Promise.resolve({ error: null }),
          };
        }
        return mockDb;
      });

      const request = createMockRequest(formData);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
    });

    it('should handle "failed" status', async () => {
      const formData = {
        MessageSid: 'SM_test123',
        MessageStatus: 'failed',
        To: '+14155552671',
        From: '+12125552671',
        Body: 'Test message',
        ErrorCode: '30007',
        ErrorMessage: 'Carrier violation',
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'sent_messages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'msg-123',
                      status: 'sent',
                      contact_id: 'contact-123',
                    },
                    error: null,
                  }),
              }),
            }),
            update: vi.fn(() => ({
              eq: () => Promise.resolve({ error: null }),
            })),
          };
        }
        if (table === 'activities') {
          return {
            insert: () => Promise.resolve({ error: null }),
          };
        }
        return mockDb;
      });

      const request = createMockRequest(formData);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
    });

    it('should handle "undelivered" status', async () => {
      const formData = {
        MessageSid: 'SM_test123',
        MessageStatus: 'undelivered',
        To: '+14155552671',
        From: '+12125552671',
        Body: 'Test message',
        ErrorCode: '30003',
        ErrorMessage: 'Unreachable destination',
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'sent_messages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'msg-123',
                      status: 'sent',
                      contact_id: 'contact-123',
                    },
                    error: null,
                  }),
              }),
            }),
            update: vi.fn(() => ({
              eq: () => Promise.resolve({ error: null }),
            })),
          };
        }
        if (table === 'activities') {
          return {
            insert: () => Promise.resolve({ error: null }),
          };
        }
        return mockDb;
      });

      const request = createMockRequest(formData);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      delete process.env.TWILIO_AUTH_TOKEN;
    });

    it('should handle invalid JSON gracefully', async () => {
      const request = {
        formData: vi.fn().mockRejectedValue(new Error('Invalid form data')),
        headers: new Map(),
        url: 'https://example.com/api/webhooks/twilio',
      } as unknown as NextRequest;

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should handle missing message gracefully', async () => {
      const formData = {
        MessageSid: 'SM_nonexistent',
        MessageStatus: 'delivered',
        To: '+14155552671',
        From: '+12125552671',
        Body: 'Test message',
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'sent_messages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: null,
                    error: null,
                  }),
              }),
            }),
          };
        }
        return mockDb;
      });

      const request = createMockRequest(formData);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.warning).toBe('Message not found');
    });

    it('should handle database errors', async () => {
      const formData = {
        MessageSid: 'SM_test123',
        MessageStatus: 'delivered',
        To: '+14155552671',
        From: '+12125552671',
        Body: 'Test message',
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'sent_messages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: null,
                    error: { message: 'Database error' },
                  }),
              }),
            }),
          };
        }
        return mockDb;
      });

      const request = createMockRequest(formData);
      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('Auto-Response Handling', () => {
    beforeEach(() => {
      delete process.env.TWILIO_AUTH_TOKEN;
    });

    it('should handle STOP keyword and revoke consent', async () => {
      const formData = {
        From: '+14155552671',
        To: '+12125552671',
        Body: 'STOP',
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'contacts') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'contact-123',
                      sms_consent: true,
                    },
                    error: null,
                  }),
              }),
            }),
            update: vi.fn(() => ({
              eq: () => Promise.resolve({ error: null }),
            })),
          };
        }
        if (table === 'activities') {
          return {
            insert: () => Promise.resolve({ error: null }),
          };
        }
        return mockDb;
      });

      const request = createMockRequest(formData);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.autoResponse).toBe(true);
    });

    it('should handle START keyword and grant consent', async () => {
      const formData = {
        From: '+14155552671',
        To: '+12125552671',
        Body: 'START',
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'contacts') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'contact-123',
                      sms_consent: false,
                    },
                    error: null,
                  }),
              }),
            }),
            update: vi.fn(() => ({
              eq: () => Promise.resolve({ error: null }),
            })),
          };
        }
        if (table === 'activities') {
          return {
            insert: () => Promise.resolve({ error: null }),
          };
        }
        return mockDb;
      });

      const request = createMockRequest(formData);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.autoResponse).toBe(true);
    });

    it('should handle HELP keyword', async () => {
      const formData = {
        From: '+14155552671',
        To: '+12125552671',
        Body: 'HELP',
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'contacts') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'contact-123',
                      sms_consent: true,
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        return mockDb;
      });

      const request = createMockRequest(formData);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.autoResponse).toBe(true);
    });

    it('should handle non-keyword messages', async () => {
      const formData = {
        From: '+14155552671',
        To: '+12125552671',
        Body: 'Thanks for the message!',
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        return mockDb;
      });

      const request = createMockRequest(formData);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
      expect(json.autoResponse).toBeUndefined();
    });
  });
});
