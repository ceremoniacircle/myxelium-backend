/**
 * Tests for Admin Events API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as listEvents } from '@/app/api/admin/events/route';
import { GET as getEvent } from '@/app/api/admin/events/[id]/route';
import { POST as cancelEvent } from '@/app/api/admin/events/[id]/cancel/route';
import { NextRequest } from 'next/server';

// Mock database
vi.mock('@/lib/db');
vi.mock('@/inngest/client');

describe('Admin Events API', () => {
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import mocked db
    const { db } = await import('@/lib/db');
    mockDb = db as any;

    // Setup default mock chain
    mockDb.from = vi.fn(() => mockDb);
    mockDb.select = vi.fn(() => mockDb);
    mockDb.insert = vi.fn(() => mockDb);
    mockDb.update = vi.fn(() => mockDb);
    mockDb.eq = vi.fn(() => mockDb);
    mockDb.in = vi.fn(() => mockDb);
    mockDb.gte = vi.fn(() => mockDb);
    mockDb.lte = vi.fn(() => mockDb);
    mockDb.order = vi.fn(() => mockDb);
    mockDb.range = vi.fn(() => mockDb);
    mockDb.single = vi.fn(() => ({ data: null, error: null }));
    mockDb.maybeSingle = vi.fn(() => ({ data: null, error: null }));
  });

  describe('GET /api/admin/events', () => {
    it('should list events with default parameters', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Webinar 1',
          description: 'Test event',
          scheduled_at: '2025-10-15T10:00:00Z',
          timezone: 'America/Los_Angeles',
          duration_minutes: 60,
          platform: 'zoom_webinar',
          status: 'upcoming',
          created_at: '2025-10-01T10:00:00Z'
        },
        {
          id: 'event-2',
          title: 'Webinar 2',
          description: 'Another test',
          scheduled_at: '2025-10-20T14:00:00Z',
          timezone: 'America/New_York',
          duration_minutes: 90,
          platform: 'zoom_meeting',
          status: 'upcoming',
          created_at: '2025-10-01T11:00:00Z'
        }
      ];

      const mockRegistrations = [
        { event_id: 'event-1', attended: true },
        { event_id: 'event-1', attended: false },
        { event_id: 'event-2', attended: true }
      ];

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'events') {
          return {
            select: vi.fn(() => ({
              count: 2,
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({ data: mockEvents, error: null }))
                }))
              })),
              order: vi.fn(() => ({
                range: vi.fn(() => Promise.resolve({ data: mockEvents, error: null }))
              }))
            }))
          };
        }
        if (table === 'registrations') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({ data: mockRegistrations, error: null }))
            }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/events');
      const response = await listEvents(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(2);
      expect(json.data[0].id).toBe('event-1');
      expect(json.data[0].enrollment_count).toBe(2);
      expect(json.data[0].attendance_count).toBe(1);
      expect(json.total).toBe(2);
    });

    it('should filter events by status', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Upcoming Event',
          description: 'Test',
          scheduled_at: '2025-10-15T10:00:00Z',
          timezone: 'UTC',
          duration_minutes: 60,
          platform: 'zoom_webinar',
          status: 'upcoming',
          created_at: '2025-10-01T10:00:00Z'
        }
      ];

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'events') {
          return {
            select: vi.fn(() => ({
              count: 1,
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({ data: mockEvents, error: null }))
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

      const request = new NextRequest('http://localhost/api/admin/events?status=upcoming');
      const response = await listEvents(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].status).toBe('upcoming');
    });

    it('should validate limit parameter', async () => {
      const request = new NextRequest('http://localhost/api/admin/events?limit=200');
      const response = await listEvents(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('Limit must be between 1 and 100');
    });

    it('should validate status parameter', async () => {
      const request = new NextRequest('http://localhost/api/admin/events?status=invalid');
      const response = await listEvents(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('Invalid status');
    });
  });

  describe('GET /api/admin/events/[id]', () => {
    it('should get event details with statistics', async () => {
      const mockEvent = {
        id: 'event-1',
        title: 'Test Event',
        description: 'Description',
        scheduled_at: '2025-10-15T10:00:00Z',
        timezone: 'UTC',
        duration_minutes: 60,
        platform: 'zoom_webinar',
        platform_event_id: '123456789',
        join_url: 'https://zoom.us/j/123',
        status: 'upcoming',
        created_at: '2025-10-01T10:00:00Z',
        updated_at: '2025-10-01T10:00:00Z'
      };

      const mockRegistrations = [
        {
          id: 'reg-1',
          contact_id: 'contact-1',
          registered_at: '2025-10-02T10:00:00Z',
          attended: true,
          attended_at: '2025-10-15T10:05:00Z',
          attendance_duration_minutes: 55,
          status: 'attended',
          contacts: {
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe'
          }
        }
      ];

      const mockMessages = [
        {
          id: 'msg-1',
          channel: 'email',
          status: 'delivered',
          opened_at: '2025-10-02T11:00:00Z',
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
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockRegistrations, error: null }))
              }))
            }))
          };
        }
        if (table === 'sent_messages') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockMessages, error: null }))
            }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/events/event-1');
      const response = await getEvent(request, { params: Promise.resolve({ id: 'event-1' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.event.id).toBe('event-1');
      expect(json.stats.total_registrations).toBe(1);
      expect(json.stats.attended).toBe(1);
      expect(json.stats.attendance_rate).toBe(100);
      expect(json.recent_registrations).toHaveLength(1);
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

      const request = new NextRequest('http://localhost/api/admin/events/invalid-id');
      const response = await getEvent(request, { params: Promise.resolve({ id: 'invalid-id' }) });
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error).toBe('Event not found');
    });
  });

  describe('POST /api/admin/events/[id]/cancel', () => {
    it('should cancel an event', async () => {
      const mockEvent = {
        id: 'event-1',
        title: 'Test Event',
        status: 'upcoming'
      };

      const mockRegistrations = [
        { id: 'reg-1' },
        { id: 'reg-2' }
      ];

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockEvent, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
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
        if (table === 'activities') {
          return {
            insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/events/event-1/cancel', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Testing' })
      });
      const response = await cancelEvent(request, { params: Promise.resolve({ id: 'event-1' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.event_id).toBe('event-1');
      expect(json.message).toContain('2 registrations');
    });

    it('should reject cancellation of already cancelled event', async () => {
      const mockEvent = {
        id: 'event-1',
        title: 'Test Event',
        status: 'cancelled'
      };

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
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/events/event-1/cancel', {
        method: 'POST'
      });
      const response = await cancelEvent(request, { params: Promise.resolve({ id: 'event-1' }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('Event is already cancelled');
    });
  });
});
