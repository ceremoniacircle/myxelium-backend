/**
 * Tests for Admin Messages API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as listMessages } from '@/app/api/admin/messages/route';
import { POST as sendMessage } from '@/app/api/admin/messages/send/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/db');
vi.mock('@/lib/resend/client', () => ({
  resend: {
    emails: {
      send: vi.fn()
    }
  },
  DEFAULT_FROM: 'Test <test@example.com>'
}));
vi.mock('@/lib/twilio/client', () => ({
  twilioClient: {
    messages: {
      create: vi.fn()
    }
  },
  TWILIO_PHONE_NUMBER: '+1234567890'
}));

describe('Admin Messages API', () => {
  let mockDb: any;

  beforeEach(async () => {
    // Disable admin authentication for tests
    process.env.ADMIN_AUTH_ENABLED = 'false';

    vi.clearAllMocks();

    const { db } = await import('@/lib/db');
    mockDb = db as any;

    mockDb.from = vi.fn(() => mockDb);
    mockDb.select = vi.fn(() => mockDb);
    mockDb.insert = vi.fn(() => mockDb);
    mockDb.eq = vi.fn(() => mockDb);
    mockDb.in = vi.fn(() => mockDb);
    mockDb.order = vi.fn(() => mockDb);
    mockDb.range = vi.fn(() => mockDb);
    mockDb.single = vi.fn(() => ({ data: null, error: null }));
    mockDb.maybeSingle = vi.fn(() => ({ data: null, error: null }));
  });

  afterEach(() => {
    delete process.env.ADMIN_AUTH_ENABLED;
  });

  describe('GET /api/admin/messages', () => {
    it('should list messages with default parameters', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          contact_id: 'contact-1',
          registration_id: 'reg-1',
          channel: 'email',
          subject: 'Welcome Email',
          status: 'delivered',
          sent_at: '2025-10-02T10:00:00Z',
          delivered_at: '2025-10-02T10:01:00Z',
          opened_at: '2025-10-02T11:00:00Z',
          clicked_at: null,
          error_message: null,
          contacts: {
            email: 'john@example.com',
            first_name: 'John',
            last_name: 'Doe'
          }
        },
        {
          id: 'msg-2',
          contact_id: 'contact-2',
          registration_id: null,
          channel: 'sms',
          subject: null,
          status: 'delivered',
          sent_at: '2025-10-02T12:00:00Z',
          delivered_at: '2025-10-02T12:01:00Z',
          opened_at: null,
          clicked_at: null,
          error_message: null,
          contacts: {
            email: 'jane@example.com',
            first_name: 'Jane',
            last_name: 'Smith'
          }
        }
      ];

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'sent_messages') {
          return {
            select: vi.fn(() => ({
              count: 2,
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({ data: mockMessages, error: null }))
                }))
              })),
              order: vi.fn(() => ({
                range: vi.fn(() => Promise.resolve({ data: mockMessages, error: null }))
              }))
            }))
          };
        }
        if (table === 'registrations') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({
                data: [{ id: 'reg-1', events: { title: 'Test Event' } }],
                error: null
              }))
            }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/messages');
      const response = await listMessages(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(2);
      expect(json.data[0].id).toBe('msg-1');
      expect(json.data[0].contact_email).toBe('john@example.com');
      expect(json.data[0].contact_name).toBe('John Doe');
      expect(json.total).toBe(2);
    });

    it('should filter messages by channel', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          contact_id: 'contact-1',
          registration_id: null,
          channel: 'email',
          subject: 'Test',
          status: 'delivered',
          sent_at: '2025-10-02T10:00:00Z',
          delivered_at: null,
          opened_at: null,
          clicked_at: null,
          error_message: null,
          contacts: {
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User'
          }
        }
      ];

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'sent_messages') {
          return {
            select: vi.fn(() => ({
              count: 1,
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({ data: mockMessages, error: null }))
                }))
              }))
            }))
          };
        }
        if (table === 'registrations') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/messages?channel=email');
      const response = await listMessages(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].channel).toBe('email');
    });

    it('should validate channel parameter', async () => {
      const request = new NextRequest('http://localhost/api/admin/messages?channel=invalid');
      const response = await listMessages(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('Invalid channel');
    });
  });

  describe('POST /api/admin/messages/send', () => {
    it('should send an email message', async () => {
      const mockContact = {
        id: 'contact-1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone: null,
        consent: {
          email: { granted: true },
          sms: { granted: false },
          marketing: { granted: true }
        }
      };

      const mockMessageRecord = {
        id: 'msg-1',
        contact_id: 'contact-1',
        channel: 'email',
        provider: 'resend',
        subject: 'Test Message',
        content: 'Test content',
        status: 'sent',
        provider_message_id: 'resend-123',
        sent_at: '2025-10-02T10:00:00Z'
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'contacts') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockContact, error: null }))
              }))
            }))
          };
        }
        if (table === 'sent_messages') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockMessageRecord, error: null }))
              }))
            }))
          };
        }
        if (table === 'activities') {
          return {
            insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
          };
        }
        return mockDb;
      });

      // Mock Resend
      const { resend } = await import('@/lib/resend/client');
      (resend.emails.send as any) = vi.fn().mockResolvedValue({
        data: { id: 'resend-123' },
        error: null
      });

      const request = new NextRequest('http://localhost/api/admin/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          contact_id: 'contact-1',
          channel: 'email',
          subject: 'Test Message',
          content: 'Test content'
        })
      });

      const response = await sendMessage(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message_id).toBe('msg-1');
      expect(json.provider_message_id).toBe('resend-123');
    });

    it('should validate consent before sending', async () => {
      const mockContact = {
        id: 'contact-1',
        email: 'test@example.com',
        consent: {
          email: { granted: false }
        }
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'contacts') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockContact, error: null }))
              }))
            }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          contact_id: 'contact-1',
          channel: 'email',
          content: 'Test'
        })
      });

      const response = await sendMessage(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('not consented');
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost/api/admin/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          contact_id: 'contact-1'
        })
      });

      const response = await sendMessage(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('Missing required fields');
    });

    it('should return 404 for non-existent contact', async () => {
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'contacts') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
              }))
            }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          contact_id: 'invalid',
          channel: 'email',
          content: 'Test'
        })
      });

      const response = await sendMessage(request);
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error).toBe('Contact not found');
    });
  });
});
