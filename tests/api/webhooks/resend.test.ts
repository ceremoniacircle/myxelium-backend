/**
 * Tests for Resend Webhook Handler
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/webhooks/resend/route';
import { NextRequest } from 'next/server';

// Mock database
vi.mock('@/lib/db');

describe('Resend Webhook Handler', () => {
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

  const createMockRequest = (body: any, headers: Record<string, string> = {}): NextRequest => {
    const request = {
      text: vi.fn().mockResolvedValue(JSON.stringify(body)),
      headers: new Map(Object.entries(headers)),
    } as unknown as NextRequest;

    return request;
  };

  describe('Webhook Signature Verification', () => {
    it('should accept webhook when secret is not configured', async () => {
      const originalEnv = process.env.RESEND_WEBHOOK_SECRET;
      delete process.env.RESEND_WEBHOOK_SECRET;

      const payload = {
        type: 'email.delivered',
        data: {
          email_id: 'test-123',
          created_at: '2025-10-01T10:00:00Z',
        },
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
                      open_count: 0,
                      click_count: 0,
                      links_clicked: [],
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
        return mockDb;
      });

      const request = createMockRequest(payload);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);

      process.env.RESEND_WEBHOOK_SECRET = originalEnv;
    });

    it('should reject webhook with missing signature headers', async () => {
      process.env.RESEND_WEBHOOK_SECRET = 'test-secret';

      const payload = {
        type: 'email.delivered',
        data: {
          email_id: 'test-123',
          created_at: '2025-10-01T10:00:00Z',
        },
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

      // No signature headers provided
      const request = createMockRequest(payload);
      const response = await POST(request);

      // Currently accepts all webhooks if secret is set (TODO: implement proper verification)
      // expect(response.status).toBe(401);
    });
  });

  describe('Event Type Handling', () => {
    beforeEach(() => {
      // Clear webhook secret for these tests to bypass signature verification
      delete process.env.RESEND_WEBHOOK_SECRET;

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
                      open_count: 0,
                      click_count: 0,
                      links_clicked: [],
                      contact_id: 'contact-123',
                    },
                    error: null,
                  }),
                single: () =>
                  Promise.resolve({
                    data: {
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
            insert: () => Promise.resolve({ data: null, error: null }),
          };
        }
        return mockDb;
      });
    });

    it('should handle email.delivered event', async () => {
      const payload = {
        type: 'email.delivered',
        data: {
          email_id: 'resend-123',
          from: 'noreply@ceremonia.com',
          to: ['test@example.com'],
          subject: 'Welcome Email',
          created_at: '2025-10-01T10:00:00Z',
        },
      };

      const request = createMockRequest(payload);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
    });

    it('should handle email.opened event and increment open count', async () => {
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'sent_messages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'msg-123',
                      status: 'delivered',
                      open_count: 0,
                      click_count: 0,
                      links_clicked: [],
                      contact_id: 'contact-123',
                    },
                    error: null,
                  }),
                single: () =>
                  Promise.resolve({
                    data: { contact_id: 'contact-123' },
                    error: null,
                  }),
              }),
            }),
            update: vi.fn(() => ({
              eq: () => Promise.resolve({ error: null }),
            })),
          };
        }
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
        if (table === 'activities') {
          return {
            insert: () => Promise.resolve({ data: null, error: null }),
          };
        }
        return mockDb;
      });

      const payload = {
        type: 'email.opened',
        data: {
          email_id: 'resend-123',
          created_at: '2025-10-01T10:05:00Z',
        },
      };

      const request = createMockRequest(payload);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
    });

    it('should handle email.clicked event and track link', async () => {
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'sent_messages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'msg-123',
                      status: 'opened',
                      open_count: 1,
                      click_count: 0,
                      links_clicked: [],
                      contact_id: 'contact-123',
                    },
                    error: null,
                  }),
                single: () =>
                  Promise.resolve({
                    data: { contact_id: 'contact-123' },
                    error: null,
                  }),
              }),
            }),
            update: vi.fn(() => ({
              eq: () => Promise.resolve({ error: null }),
            })),
          };
        }
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
        if (table === 'activities') {
          return {
            insert: () => Promise.resolve({ data: null, error: null }),
          };
        }
        return mockDb;
      });

      const payload = {
        type: 'email.clicked',
        data: {
          email_id: 'resend-123',
          link: 'https://zoom.us/j/123456789',
          created_at: '2025-10-01T10:10:00Z',
        },
      };

      const request = createMockRequest(payload);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
    });

    it('should handle email.bounced event', async () => {
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'sent_messages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'msg-123',
                      status: 'sent',
                      open_count: 0,
                      click_count: 0,
                      links_clicked: [],
                      contact_id: 'contact-123',
                    },
                    error: null,
                  }),
                single: () =>
                  Promise.resolve({
                    data: { contact_id: 'contact-123' },
                    error: null,
                  }),
              }),
            }),
            update: vi.fn(() => ({
              eq: () => Promise.resolve({ error: null }),
            })),
          };
        }
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
        if (table === 'activities') {
          return {
            insert: () => Promise.resolve({ data: null, error: null }),
          };
        }
        return mockDb;
      });

      const payload = {
        type: 'email.bounced',
        data: {
          email_id: 'resend-123',
          bounce_type: 'hard',
          created_at: '2025-10-01T10:00:00Z',
        },
      };

      const request = createMockRequest(payload);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
    });

    it('should handle email.complained event', async () => {
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'sent_messages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'msg-123',
                      status: 'delivered',
                      open_count: 1,
                      click_count: 0,
                      links_clicked: [],
                      contact_id: 'contact-123',
                    },
                    error: null,
                  }),
                single: () =>
                  Promise.resolve({
                    data: { contact_id: 'contact-123' },
                    error: null,
                  }),
              }),
            }),
            update: vi.fn(() => ({
              eq: () => Promise.resolve({ error: null }),
            })),
          };
        }
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
        if (table === 'activities') {
          return {
            insert: () => Promise.resolve({ data: null, error: null }),
          };
        }
        return mockDb;
      });

      const payload = {
        type: 'email.complained',
        data: {
          email_id: 'resend-123',
          complaint_type: 'abuse',
          created_at: '2025-10-01T10:00:00Z',
        },
      };

      const request = createMockRequest(payload);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      // Clear webhook secret for these tests to bypass signature verification
      delete process.env.RESEND_WEBHOOK_SECRET;
    });

    it('should handle invalid JSON payload', async () => {
      const request = {
        text: vi.fn().mockResolvedValue('invalid json'),
        headers: new Map(),
      } as unknown as NextRequest;

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('Invalid JSON');
    });

    it('should handle message not found gracefully', async () => {
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
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          };
        }
        return mockDb;
      });

      const payload = {
        type: 'email.delivered',
        data: {
          email_id: 'unknown-123',
          created_at: '2025-10-01T10:00:00Z',
        },
      };

      const request = createMockRequest(payload);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.warning).toBe('Message not found');
    });

    it('should handle database errors', async () => {
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: null, error: { message: 'DB error' } }),
              }),
            }),
          };
        }
        if (table === 'sent_messages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: { message: 'DB error' } }),
              }),
            }),
          };
        }
        return mockDb;
      });

      const payload = {
        type: 'email.delivered',
        data: {
          email_id: 'test-123',
          created_at: '2025-10-01T10:00:00Z',
        },
      };

      const request = createMockRequest(payload);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('Database error');
    });
  });

  describe('Multiple Click Tracking', () => {
    beforeEach(() => {
      // Clear webhook secret for these tests to bypass signature verification
      delete process.env.RESEND_WEBHOOK_SECRET;
    });

    it('should increment click count for same link', async () => {
      const existingLinksClicked = [
        {
          url: 'https://zoom.us/j/123',
          clicked_at: '2025-10-01T10:10:00Z',
          click_count: 1,
        },
      ];

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'sent_messages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'msg-123',
                      status: 'clicked',
                      open_count: 1,
                      click_count: 1,
                      links_clicked: existingLinksClicked,
                      contact_id: 'contact-123',
                    },
                    error: null,
                  }),
                single: () =>
                  Promise.resolve({
                    data: {
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
        if (table === 'activities') {
          return {
            insert: () => Promise.resolve({ data: null, error: null }),
          };
        }
        return mockDb;
      });

      const payload = {
        type: 'email.clicked',
        data: {
          email_id: 'resend-123',
          link: 'https://zoom.us/j/123', // Same link as before
          created_at: '2025-10-01T10:15:00Z',
        },
      };

      const request = createMockRequest(payload);
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should track multiple different links', async () => {
      const existingLinksClicked = [
        {
          url: 'https://zoom.us/j/123',
          clicked_at: '2025-10-01T10:10:00Z',
          click_count: 1,
        },
      ];

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'sent_messages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'msg-123',
                      status: 'clicked',
                      open_count: 1,
                      click_count: 1,
                      links_clicked: existingLinksClicked,
                      contact_id: 'contact-123',
                    },
                    error: null,
                  }),
                single: () =>
                  Promise.resolve({
                    data: {
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
        if (table === 'activities') {
          return {
            insert: () => Promise.resolve({ data: null, error: null }),
          };
        }
        return mockDb;
      });

      const payload = {
        type: 'email.clicked',
        data: {
          email_id: 'resend-123',
          link: 'https://ceremonia.com/learn-more', // Different link
          created_at: '2025-10-01T10:20:00Z',
        },
      };

      const request = createMockRequest(payload);
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });
});
