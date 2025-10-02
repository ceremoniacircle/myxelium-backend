/**
 * Tests for Admin Webhooks API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as listWebhooks } from '@/app/api/admin/webhooks/route';
import { NextRequest } from 'next/server';

// Mock database
vi.mock('@/lib/db');

describe('Admin Webhooks API', () => {
  let mockDb: any;

  beforeEach(async () => {
    // Disable admin authentication for tests
    process.env.ADMIN_AUTH_ENABLED = 'false';

    vi.clearAllMocks();

    const { db } = await import('@/lib/db');
    mockDb = db as any;

    mockDb.from = vi.fn(() => mockDb);
    mockDb.select = vi.fn(() => mockDb);
    mockDb.eq = vi.fn(() => mockDb);
    mockDb.order = vi.fn(() => mockDb);
    mockDb.range = vi.fn(() => mockDb);
  });

  afterEach(() => {
    delete process.env.ADMIN_AUTH_ENABLED;
  });

  describe('GET /api/admin/webhooks', () => {
    it('should list webhook events with default parameters', async () => {
      const mockWebhooks = [
        {
          id: 'wh-1',
          provider: 'resend',
          event_type: 'email.delivered',
          signature_valid: true,
          processed: true,
          processed_at: '2025-10-02T10:00:00Z',
          registration_id: 'reg-1',
          processing_error: null,
          created_at: '2025-10-02T10:00:00Z'
        },
        {
          id: 'wh-2',
          provider: 'twilio',
          event_type: 'message.delivered',
          signature_valid: true,
          processed: true,
          processed_at: '2025-10-02T11:00:00Z',
          registration_id: null,
          processing_error: null,
          created_at: '2025-10-02T11:00:00Z'
        },
        {
          id: 'wh-3',
          provider: 'zoom',
          event_type: 'meeting.participant_joined',
          signature_valid: false,
          processed: false,
          processed_at: null,
          registration_id: 'reg-2',
          processing_error: 'Invalid signature',
          created_at: '2025-10-02T12:00:00Z'
        }
      ];

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            select: vi.fn(() => ({
              count: 3,
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({ data: mockWebhooks, error: null }))
                }))
              })),
              order: vi.fn(() => ({
                range: vi.fn(() => Promise.resolve({ data: mockWebhooks, error: null }))
              }))
            }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/webhooks');
      const response = await listWebhooks(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(3);
      expect(json.data[0].id).toBe('wh-1');
      expect(json.data[0].provider).toBe('resend');
      expect(json.data[0].processed).toBe(true);
      expect(json.total).toBe(3);
    });

    it('should filter webhooks by provider', async () => {
      const mockWebhooks = [
        {
          id: 'wh-1',
          provider: 'resend',
          event_type: 'email.delivered',
          signature_valid: true,
          processed: true,
          processed_at: '2025-10-02T10:00:00Z',
          registration_id: null,
          processing_error: null,
          created_at: '2025-10-02T10:00:00Z'
        }
      ];

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            select: vi.fn(() => ({
              count: 1,
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({ data: mockWebhooks, error: null }))
                }))
              }))
            }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/webhooks?provider=resend');
      const response = await listWebhooks(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].provider).toBe('resend');
    });

    it('should filter webhooks by processed status', async () => {
      const mockWebhooks = [
        {
          id: 'wh-1',
          provider: 'zoom',
          event_type: 'meeting.started',
          signature_valid: true,
          processed: false,
          processed_at: null,
          registration_id: null,
          processing_error: null,
          created_at: '2025-10-02T10:00:00Z'
        }
      ];

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            select: vi.fn(() => ({
              count: 1,
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({ data: mockWebhooks, error: null }))
                }))
              }))
            }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/webhooks?processed=false');
      const response = await listWebhooks(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].processed).toBe(false);
    });

    it('should filter webhooks by signature validity', async () => {
      const mockWebhooks = [
        {
          id: 'wh-1',
          provider: 'twilio',
          event_type: 'message.failed',
          signature_valid: false,
          processed: false,
          processed_at: null,
          registration_id: null,
          processing_error: 'Invalid signature',
          created_at: '2025-10-02T10:00:00Z'
        }
      ];

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            select: vi.fn(() => ({
              count: 1,
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({ data: mockWebhooks, error: null }))
                }))
              }))
            }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/webhooks?signature_valid=false');
      const response = await listWebhooks(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].signature_valid).toBe(false);
    });

    it('should validate provider parameter', async () => {
      const request = new NextRequest('http://localhost/api/admin/webhooks?provider=invalid');
      const response = await listWebhooks(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('Invalid provider');
    });

    it('should validate limit parameter', async () => {
      const request = new NextRequest('http://localhost/api/admin/webhooks?limit=0');
      const response = await listWebhooks(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('Limit must be between 1 and 100');
    });

    it('should handle empty results', async () => {
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            select: vi.fn(() => ({
              count: 0,
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({ data: [], error: null }))
                }))
              })),
              order: vi.fn(() => ({
                range: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/webhooks');
      const response = await listWebhooks(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(0);
      expect(json.total).toBe(0);
    });

    it('should handle database errors', async () => {
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            select: vi.fn(() => ({
              count: null,
              order: vi.fn(() => ({
                range: vi.fn(() => Promise.resolve({
                  data: null,
                  error: { message: 'Database error' }
                }))
              }))
            }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/webhooks');
      const response = await listWebhooks(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('Internal server error');
    });
  });
});
