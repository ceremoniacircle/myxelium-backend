/**
 * Tests for Admin Analytics API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as getOverview } from '@/app/api/admin/analytics/overview/route';
import { GET as getEventAnalytics } from '@/app/api/admin/analytics/events/[id]/route';
import { NextRequest } from 'next/server';

// Mock database
vi.mock('@/lib/db');

describe('Admin Analytics API', () => {
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
    mockDb.in = vi.fn(() => mockDb);
    mockDb.gte = vi.fn(() => mockDb);
    mockDb.lte = vi.fn(() => mockDb);
    mockDb.not = vi.fn(() => mockDb);
    mockDb.maybeSingle = vi.fn(() => ({ data: null, error: null }));
  });

  afterEach(() => {
    delete process.env.ADMIN_AUTH_ENABLED;
  });

  describe('GET /api/admin/analytics/overview', () => {
    it('should return system-wide analytics', async () => {
      const mockEvents = [
        { id: 'event-1', status: 'upcoming', created_at: '2025-10-01T10:00:00Z' },
        { id: 'event-2', status: 'completed', created_at: '2025-10-02T10:00:00Z' },
        { id: 'event-3', status: 'cancelled', created_at: '2025-10-03T10:00:00Z' }
      ];

      const mockContacts = [
        { id: 'contact-1', created_at: '2025-10-01T10:00:00Z' },
        { id: 'contact-2', created_at: '2025-10-05T10:00:00Z' }
      ];

      const mockRegistrations = [
        { id: 'reg-1', attended: true },
        { id: 'reg-2', attended: false },
        { id: 'reg-3', attended: true },
        { id: 'reg-4', attended: null }
      ];

      const mockMessages = [
        { id: 'msg-1', channel: 'email', status: 'delivered', opened_at: '2025-10-02T10:00:00Z', clicked_at: null },
        { id: 'msg-2', channel: 'email', status: 'delivered', opened_at: null, clicked_at: null },
        { id: 'msg-3', channel: 'sms', status: 'delivered', opened_at: null, clicked_at: null },
        { id: 'msg-4', channel: 'email', status: 'failed', opened_at: null, clicked_at: null }
      ];

      let fromCallCount = 0;
      mockDb.from.mockImplementation((table: string) => {
        fromCallCount++;

        if (table === 'events') {
          return {
            select: vi.fn(() => Promise.resolve({ data: mockEvents, error: null }))
          };
        }
        if (table === 'contacts') {
          return {
            select: vi.fn(() => Promise.resolve({ data: mockContacts, error: null }))
          };
        }
        if (table === 'registrations') {
          if (fromCallCount === 3) {
            // Period registrations query
            return {
              select: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => Promise.resolve({ data: [], error: null }))
                }))
              }))
            };
          }
          // All registrations query
          return {
            select: vi.fn(() => Promise.resolve({ data: mockRegistrations, error: null }))
          };
        }
        if (table === 'sent_messages') {
          if (fromCallCount === 6) {
            // Contact email stats query
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  not: vi.fn(() => Promise.resolve({
                    data: [{ contact_id: 'contact-1', opened_at: '2025-10-02T10:00:00Z' }],
                    error: null
                  }))
                }))
              }))
            };
          }
          // All messages query
          return {
            select: vi.fn(() => Promise.resolve({ data: mockMessages, error: null }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/analytics/overview');
      const response = await getOverview(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.events.total).toBe(3);
      expect(json.events.upcoming).toBe(1);
      expect(json.events.completed).toBe(1);
      expect(json.events.cancelled).toBe(1);
      expect(json.contacts.total).toBe(2);
      expect(json.registrations.total).toBe(4);
      expect(json.registrations.total_attended).toBe(2);
      expect(json.messages.total).toBe(4);
      expect(json.messages.email).toBe(3);
      expect(json.messages.sms).toBe(1);
    });

    it('should filter by date range', async () => {
      let fromCallCount = 0;
      mockDb.from.mockImplementation((table: string) => {
        fromCallCount++;

        if (table === 'events') {
          return {
            select: vi.fn(() => Promise.resolve({ data: [], error: null }))
          };
        }
        if (table === 'contacts') {
          return {
            select: vi.fn(() => Promise.resolve({ data: [], error: null }))
          };
        }
        if (table === 'registrations') {
          if (fromCallCount === 3) {
            // Period query
            return {
              select: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => Promise.resolve({ data: [], error: null }))
                }))
              }))
            };
          }
          return {
            select: vi.fn(() => Promise.resolve({ data: [], error: null }))
          };
        }
        if (table === 'sent_messages') {
          if (fromCallCount === 6) {
            // Contact email stats query
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  not: vi.fn(() => Promise.resolve({ data: [], error: null }))
                }))
              }))
            };
          }
          return {
            select: vi.fn(() => Promise.resolve({ data: [], error: null }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest(
        'http://localhost/api/admin/analytics/overview?start_date=2025-10-01&end_date=2025-10-31'
      );
      const response = await getOverview(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.period.start).toBeTruthy();
      expect(json.period.end).toBeTruthy();
    });

    it('should validate date parameters', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/analytics/overview?start_date=invalid'
      );
      const response = await getOverview(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('Invalid date format');
    });
  });

  describe('GET /api/admin/analytics/events/[id]', () => {
    it('should return event-specific analytics', async () => {
      const mockEvent = {
        id: 'event-1',
        title: 'Test Event',
        scheduled_at: '2025-10-15T10:00:00Z'
      };

      const mockRegistrations = [
        { id: 'reg-1', attended: true },
        { id: 'reg-2', attended: true },
        { id: 'reg-3', attended: false },
        { id: 'reg-4', attended: null }
      ];

      const mockMessages = [
        {
          id: 'msg-1',
          template_id: 'welcome-email',
          status: 'delivered',
          opened_at: '2025-10-02T10:00:00Z',
          clicked_at: null
        },
        {
          id: 'msg-2',
          template_id: 'reminder-24h',
          status: 'delivered',
          opened_at: null,
          clicked_at: null
        },
        {
          id: 'msg-3',
          template_id: 'reminder-1h',
          status: 'delivered',
          opened_at: null,
          clicked_at: null
        },
        {
          id: 'msg-4',
          template_id: 'post-event-followup',
          status: 'delivered',
          opened_at: null,
          clicked_at: null
        }
      ];

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockEvent, error: null }))
              }))
            }))
          };
        }
        if (table === 'registrations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockRegistrations, error: null }))
            }))
          };
        }
        if (table === 'sent_messages') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({ data: mockMessages, error: null }))
            }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/analytics/events/event-1');
      const response = await getEventAnalytics(request, { params: Promise.resolve({ id: 'event-1' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.event.id).toBe('event-1');
      expect(json.funnel_metrics.registrations).toBe(4);
      expect(json.funnel_metrics.attended).toBe(2);
      expect(json.funnel_metrics.no_show).toBe(1);
      expect(json.funnel_metrics.attendance_rate).toBe(50);
      expect(json.funnel_metrics.welcome_emails_sent).toBe(1);
      expect(json.timeline).toHaveLength(5);
    });

    it('should return 404 for non-existent event', async () => {
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'events') {
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

      const request = new NextRequest('http://localhost/api/admin/analytics/events/invalid-id');
      const response = await getEventAnalytics(request, { params: Promise.resolve({ id: 'invalid-id' }) });
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error).toBe('Event not found');
    });
  });
});
