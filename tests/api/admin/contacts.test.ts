/**
 * Tests for Admin Contacts API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as listContacts } from '@/app/api/admin/contacts/route';
import { GET as getContact } from '@/app/api/admin/contacts/[id]/route';
import { NextRequest } from 'next/server';

// Mock database
vi.mock('@/lib/db');

describe('Admin Contacts API', () => {
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
    mockDb.or = vi.fn(() => mockDb);
    mockDb.order = vi.fn(() => mockDb);
    mockDb.range = vi.fn(() => mockDb);
    mockDb.limit = vi.fn(() => mockDb);
    mockDb.maybeSingle = vi.fn(() => ({ data: null, error: null }));
  });

  afterEach(() => {
    delete process.env.ADMIN_AUTH_ENABLED;
  });

  describe('GET /api/admin/contacts', () => {
    it('should list contacts with statistics', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe',
          phone: '+1234567890',
          consent: {
            email: { granted: true },
            sms: { granted: false },
            marketing: { granted: true }
          },
          timezone: 'America/Los_Angeles',
          created_at: '2025-10-01T10:00:00Z'
        },
        {
          id: 'contact-2',
          email: 'jane@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
          phone: null,
          consent: {
            email: { granted: true },
            sms: { granted: true },
            marketing: { granted: false }
          },
          timezone: 'America/New_York',
          created_at: '2025-10-02T10:00:00Z'
        }
      ];

      const mockRegistrations = [
        { contact_id: 'contact-1' },
        { contact_id: 'contact-1' },
        { contact_id: 'contact-2' }
      ];

      const mockMessages = [
        { contact_id: 'contact-1' },
        { contact_id: 'contact-2' },
        { contact_id: 'contact-2' }
      ];

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'contacts') {
          return {
            select: vi.fn(() => ({
              count: 2,
              or: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({ data: mockContacts, error: null }))
                }))
              })),
              order: vi.fn(() => ({
                range: vi.fn(() => Promise.resolve({ data: mockContacts, error: null }))
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
        if (table === 'sent_messages') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({ data: mockMessages, error: null }))
            }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/contacts');
      const response = await listContacts(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(2);
      expect(json.data[0].id).toBe('contact-1');
      expect(json.data[0].consent_email).toBe(true);
      expect(json.data[0].consent_sms).toBe(false);
      expect(json.data[0].total_events).toBe(2);
      expect(json.data[0].total_messages).toBe(1);
    });

    it('should search contacts by email', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe',
          phone: null,
          consent: {
            email: { granted: true },
            sms: { granted: false },
            marketing: { granted: true }
          },
          timezone: null,
          created_at: '2025-10-01T10:00:00Z'
        }
      ];

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'contacts') {
          return {
            select: vi.fn(() => ({
              count: 1,
              or: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({ data: mockContacts, error: null }))
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
        if (table === 'sent_messages') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/contacts?search=john');
      const response = await listContacts(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(1);
    });

    it('should validate limit parameter', async () => {
      const request = new NextRequest('http://localhost/api/admin/contacts?limit=500');
      const response = await listContacts(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('Limit must be between 1 and 100');
    });
  });

  describe('GET /api/admin/contacts/[id]', () => {
    it('should get contact details with activity', async () => {
      const mockContact = {
        id: 'contact-1',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890',
        consent: {
          email: { granted: true },
          sms: { granted: true },
          marketing: { granted: false }
        },
        timezone: 'America/Los_Angeles',
        created_at: '2025-10-01T10:00:00Z',
        updated_at: '2025-10-01T10:00:00Z'
      };

      const mockRegistrations = [
        {
          id: 'reg-1',
          registered_at: '2025-10-02T10:00:00Z',
          attended: true,
          attendance_duration_minutes: 55,
          events: {
            id: 'event-1',
            title: 'Test Event',
            scheduled_at: '2025-10-15T10:00:00Z'
          }
        }
      ];

      const mockMessages = [
        {
          id: 'msg-1',
          channel: 'email',
          subject: 'Welcome',
          sent_at: '2025-10-02T10:05:00Z',
          status: 'delivered',
          opened_at: '2025-10-02T11:00:00Z',
          clicked_at: null
        }
      ];

      const mockActivities = [
        {
          id: 'act-1',
          activity_type: 'event_registered',
          activity_data: { event_id: 'event-1' },
          occurred_at: '2025-10-02T10:00:00Z',
          source: 'api'
        }
      ];

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
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({ data: mockMessages, error: null }))
                }))
              }))
            }))
          };
        }
        if (table === 'activities') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({ data: mockActivities, error: null }))
                }))
              }))
            }))
          };
        }
        return mockDb;
      });

      const request = new NextRequest('http://localhost/api/admin/contacts/contact-1');
      const response = await getContact(request, { params: Promise.resolve({ id: 'contact-1' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.contact.id).toBe('contact-1');
      expect(json.contact.email).toBe('john@example.com');
      expect(json.stats.total_events).toBe(1);
      expect(json.stats.events_attended).toBe(1);
      expect(json.stats.attendance_rate).toBe(100);
      expect(json.recent_events).toHaveLength(1);
      expect(json.recent_messages).toHaveLength(1);
      expect(json.recent_activities).toHaveLength(1);
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

      const request = new NextRequest('http://localhost/api/admin/contacts/invalid-id');
      const response = await getContact(request, { params: Promise.resolve({ id: 'invalid-id' }) });
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error).toBe('Contact not found');
    });
  });
});
