/**
 * Tests for Zoom Webhook Handler
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/webhooks/zoom/route';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Mock dependencies
vi.mock('@/lib/db');
vi.mock('@/inngest/client');

describe('Zoom Webhook Handler', () => {
  let mockDb: any;
  let mockInngest: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import mocked modules
    const { db } = await import('@/lib/db');
    const { inngest } = await import('@/inngest/client');

    mockDb = db as any;
    mockInngest = inngest as any;

    // Setup default mock responses
    mockDb.from = vi.fn(() => mockDb);
    mockDb.insert = vi.fn(() => mockDb);
    mockDb.select = vi.fn(() => mockDb);
    mockDb.update = vi.fn(() => mockDb);
    mockDb.eq = vi.fn(() => mockDb);
    mockDb.in = vi.fn(() => mockDb);
    mockDb.single = vi.fn(() => ({ data: null, error: null }));
    mockDb.maybeSingle = vi.fn(() => ({ data: null, error: null }));

    mockInngest.send = vi.fn().mockResolvedValue({ ids: ['test-id'] });
  });

  const createMockRequest = (
    body: any,
    headers: Record<string, string> = {}
  ): NextRequest => {
    const bodyString = JSON.stringify(body);
    const request = {
      text: vi.fn().mockResolvedValue(bodyString),
      headers: new Map(Object.entries(headers)),
    } as unknown as NextRequest;

    return request;
  };

  const generateZoomSignature = (
    payload: string,
    timestamp: string,
    secret: string
  ): string => {
    const message = `v0:${timestamp}:${payload}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(message);
    return `v0=${hmac.digest('hex')}`;
  };

  describe('URL Verification Challenge', () => {
    it('should handle endpoint.url_validation event', async () => {
      process.env.ZOOM_WEBHOOK_SECRET_TOKEN = 'test-secret-token';

      const payload = {
        event: 'endpoint.url_validation',
        payload: {
          plainToken: 'random-token-123',
        },
      };

      const request = createMockRequest(payload);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.plainToken).toBe('random-token-123');
      expect(json.encryptedToken).toBeDefined();
      expect(typeof json.encryptedToken).toBe('string');
    });

    it('should return encrypted token that matches HMAC-SHA256', async () => {
      process.env.ZOOM_WEBHOOK_SECRET_TOKEN = 'test-secret-token';

      const plainToken = 'test-token-xyz';
      const payload = {
        event: 'endpoint.url_validation',
        payload: {
          plainToken,
        },
      };

      const request = createMockRequest(payload);
      const response = await POST(request);
      const json = await response.json();

      // Calculate expected encrypted token
      const hmac = crypto.createHmac('sha256', 'test-secret-token');
      hmac.update(plainToken);
      const expectedToken = hmac.digest('hex');

      expect(json.encryptedToken).toBe(expectedToken);
    });

    it('should return 500 if webhook secret not configured', async () => {
      delete process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

      const payload = {
        event: 'endpoint.url_validation',
        payload: {
          plainToken: 'test-token',
        },
      };

      const request = createMockRequest(payload);
      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('Signature Verification', () => {
    it('should accept valid signature', async () => {
      process.env.ZOOM_WEBHOOK_SECRET_TOKEN = 'test-secret';

      const payload = {
        event: 'meeting.started',
        event_ts: Date.now(),
        payload: {
          account_id: 'test-account',
          object: {
            uuid: 'test-uuid',
            id: '123456789',
            host_id: 'host-123',
            topic: 'Test Meeting',
            type: 2,
          },
        },
      };

      const bodyString = JSON.stringify(payload);
      const timestamp = Date.now().toString();
      const signature = generateZoomSignature(bodyString, timestamp, 'test-secret');

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        return mockDb;
      });

      const request = createMockRequest(payload, {
        'x-zm-request-timestamp': timestamp,
        'x-zm-signature': signature,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should reject invalid signature', async () => {
      process.env.ZOOM_WEBHOOK_SECRET_TOKEN = 'test-secret';

      const payload = {
        event: 'meeting.started',
        event_ts: Date.now(),
        payload: {
          account_id: 'test-account',
          object: {
            uuid: 'test-uuid',
            id: '123456789',
            host_id: 'host-123',
            topic: 'Test Meeting',
            type: 2,
          },
        },
      };

      const timestamp = Date.now().toString();

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        return mockDb;
      });

      const request = createMockRequest(payload, {
        'x-zm-request-timestamp': timestamp,
        'x-zm-signature': 'v0=invalid-signature',
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should reject missing signature headers', async () => {
      process.env.ZOOM_WEBHOOK_SECRET_TOKEN = 'test-secret';

      const payload = {
        event: 'meeting.started',
        event_ts: Date.now(),
        payload: {
          account_id: 'test-account',
          object: {
            uuid: 'test-uuid',
            id: '123456789',
            host_id: 'host-123',
            topic: 'Test Meeting',
            type: 2,
          },
        },
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'wh-123' }, error: null }),
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

      expect(response.status).toBe(401);
    });

    it('should skip verification when secret not configured', async () => {
      delete process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

      const payload = {
        event: 'meeting.started',
        event_ts: Date.now(),
        payload: {
          account_id: 'test-account',
          object: {
            uuid: 'test-uuid',
            id: '123456789',
            host_id: 'host-123',
            topic: 'Test Meeting',
            type: 2,
          },
        },
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'wh-123' }, error: null }),
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

      expect(response.status).toBe(200);
    });
  });

  describe('Participant Joined Events', () => {
    beforeEach(() => {
      delete process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
    });

    it('should handle meeting.participant_joined event', async () => {
      const payload = {
        event: 'meeting.participant_joined',
        event_ts: Date.now(),
        payload: {
          account_id: 'test-account',
          object: {
            uuid: 'test-uuid',
            id: '123456789',
            host_id: 'host-123',
            topic: 'Test Meeting',
            type: 2,
            participant: {
              user_id: 'user-123',
              user_name: 'John Doe',
              email: 'john@example.com',
              join_time: '2025-10-01T10:00:00Z',
              id: 'participant-123',
              registrant_id: 'reg-123',
            },
          },
        },
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'events') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'event-123',
                      title: 'Test Meeting',
                    },
                    error: null,
                  }),
              }),
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
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (table === 'registrations') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: {
                        id: 'registration-123',
                        contact_id: 'contact-123',
                        event_id: 'event-123',
                        attended: false,
                      },
                      error: null,
                    }),
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

      const request = createMockRequest(payload);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.processed).toBe(true);
      expect(json.action).toBe('marked_attended');
      expect(json.registrationId).toBe('registration-123');
    });

    it('should handle webinar.participant_joined event', async () => {
      const payload = {
        event: 'webinar.participant_joined',
        event_ts: Date.now(),
        payload: {
          account_id: 'test-account',
          object: {
            uuid: 'test-uuid',
            id: '987654321',
            host_id: 'host-123',
            topic: 'Test Webinar',
            type: 5,
            participant: {
              user_id: 'user-456',
              user_name: 'Jane Smith',
              email: 'jane@example.com',
              join_time: '2025-10-01T14:00:00Z',
              id: 'participant-456',
              registrant_id: 'reg-456',
            },
          },
        },
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'wh-456' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'registrations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'registration-456',
                      contact_id: 'contact-456',
                      event_id: 'event-456',
                      attended: false,
                      contacts: { email: 'jane@example.com' },
                      events: {
                        id: 'event-456',
                        title: 'Test Webinar',
                        platform_event_id: '987654321',
                      },
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

      const request = createMockRequest(payload);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.processed).toBe(true);
      expect(json.action).toBe('marked_attended');
    });

    it('should create activity record for attendance', async () => {
      const payload = {
        event: 'meeting.participant_joined',
        event_ts: Date.now(),
        payload: {
          account_id: 'test-account',
          object: {
            uuid: 'test-uuid',
            id: '123456789',
            host_id: 'host-123',
            topic: 'Test Meeting',
            type: 2,
            participant: {
              user_id: 'user-123',
              user_name: 'John Doe',
              email: 'john@example.com',
              join_time: '2025-10-01T10:00:00Z',
              id: 'participant-123',
            },
          },
        },
      };

      const activityInsertMock = vi.fn(() =>
        Promise.resolve({ data: null, error: null })
      );

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'registrations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'registration-123',
                      contact_id: 'contact-123',
                      event_id: 'event-123',
                      attended: false,
                      contacts: { email: 'john@example.com' },
                      events: {
                        id: 'event-123',
                        title: 'Test Meeting',
                        platform_event_id: '123456789',
                      },
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
            insert: activityInsertMock,
          };
        }
        return mockDb;
      });

      const request = createMockRequest(payload);
      await POST(request);

      expect(activityInsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          contact_id: 'contact-123',
          activity_type: 'event_attended',
          related_to_type: 'registration',
          related_to_id: 'registration-123',
          source: 'webhook',
        })
      );
    });

    it('should handle registration not found gracefully', async () => {
      const payload = {
        event: 'meeting.participant_joined',
        event_ts: Date.now(),
        payload: {
          account_id: 'test-account',
          object: {
            uuid: 'test-uuid',
            id: '123456789',
            host_id: 'host-123',
            topic: 'Test Meeting',
            type: 2,
            participant: {
              user_id: 'user-unknown',
              user_name: 'Unknown User',
              email: 'unknown@example.com',
              join_time: '2025-10-01T10:00:00Z',
              id: 'participant-unknown',
            },
          },
        },
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'registrations') {
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

      const request = createMockRequest(payload);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.warning).toBe('Registration not found');
    });
  });

  describe('Participant Left Events', () => {
    beforeEach(() => {
      delete process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
    });

    it('should handle meeting.participant_left event', async () => {
      const payload = {
        event: 'meeting.participant_left',
        event_ts: Date.now(),
        payload: {
          account_id: 'test-account',
          object: {
            uuid: 'test-uuid',
            id: '123456789',
            host_id: 'host-123',
            topic: 'Test Meeting',
            type: 2,
            participant: {
              user_id: 'user-123',
              user_name: 'John Doe',
              email: 'john@example.com',
              join_time: '2025-10-01T10:00:00Z',
              leave_time: '2025-10-01T11:30:00Z',
              id: 'participant-123',
            },
          },
        },
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'registrations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'registration-123',
                      contact_id: 'contact-123',
                      event_id: 'event-123',
                      events: {
                        platform_event_id: '123456789',
                      },
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
      expect(json.processed).toBe(true);
      expect(json.action).toBe('updated_duration');
      expect(json.durationMinutes).toBe(90); // 1.5 hours = 90 minutes
    });

    it('should calculate attendance duration correctly', async () => {
      const payload = {
        event: 'webinar.participant_left',
        event_ts: Date.now(),
        payload: {
          account_id: 'test-account',
          object: {
            uuid: 'test-uuid',
            id: '987654321',
            host_id: 'host-123',
            topic: 'Test Webinar',
            type: 5,
            participant: {
              user_id: 'user-456',
              user_name: 'Jane Smith',
              email: 'jane@example.com',
              join_time: '2025-10-01T14:00:00Z',
              leave_time: '2025-10-01T14:45:00Z',
              id: 'participant-456',
            },
          },
        },
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'wh-456' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'registrations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'registration-456',
                      contact_id: 'contact-456',
                      event_id: 'event-456',
                      events: {
                        platform_event_id: '987654321',
                      },
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
      expect(json.durationMinutes).toBe(45); // 45 minutes
    });
  });

  describe('Meeting/Webinar Ended Events', () => {
    beforeEach(() => {
      delete process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
    });

    it('should handle meeting.ended event', async () => {
      const payload = {
        event: 'meeting.ended',
        event_ts: Date.now(),
        payload: {
          account_id: 'test-account',
          object: {
            uuid: 'test-uuid',
            id: '123456789',
            host_id: 'host-123',
            topic: 'Test Meeting',
            type: 2,
            start_time: '2025-10-01T10:00:00Z',
            end_time: '2025-10-01T11:00:00Z',
          },
        },
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'events') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'event-123',
                      title: 'Test Meeting',
                      scheduled_at: '2025-10-01T10:00:00Z',
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
      expect(json.processed).toBe(true);
      expect(json.action).toBe('triggered_post_event_funnel');
      expect(json.eventId).toBe('event-123');
    });

    it('should handle webinar.ended event', async () => {
      const payload = {
        event: 'webinar.ended',
        event_ts: Date.now(),
        payload: {
          account_id: 'test-account',
          object: {
            uuid: 'test-uuid',
            id: '987654321',
            host_id: 'host-123',
            topic: 'Test Webinar',
            type: 5,
            start_time: '2025-10-01T14:00:00Z',
            end_time: '2025-10-01T15:00:00Z',
          },
        },
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'wh-456' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'events') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'event-456',
                      title: 'Test Webinar',
                      scheduled_at: '2025-10-01T14:00:00Z',
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
      expect(json.action).toBe('triggered_post_event_funnel');
    });

    it('should trigger Inngest event.completed', async () => {
      const payload = {
        event: 'meeting.ended',
        event_ts: Date.now(),
        payload: {
          account_id: 'test-account',
          object: {
            uuid: 'test-uuid',
            id: '123456789',
            host_id: 'host-123',
            topic: 'Test Meeting',
            type: 2,
          },
        },
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'events') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'event-123',
                      title: 'Test Meeting',
                      scheduled_at: '2025-10-01T10:00:00Z',
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
      await POST(request);

      expect(mockInngest.send).toHaveBeenCalledWith({
        name: 'event.completed',
        data: expect.objectContaining({
          eventId: 'event-123',
          eventTitle: 'Test Meeting',
        }),
      });
    });

    it('should update event status to completed', async () => {
      const payload = {
        event: 'meeting.ended',
        event_ts: Date.now(),
        payload: {
          account_id: 'test-account',
          object: {
            uuid: 'test-uuid',
            id: '123456789',
            host_id: 'host-123',
            topic: 'Test Meeting',
            type: 2,
          },
        },
      };

      const updateMock = vi.fn(() => ({
        eq: () => Promise.resolve({ error: null }),
      }));

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'events') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'event-123',
                      title: 'Test Meeting',
                      scheduled_at: '2025-10-01T10:00:00Z',
                    },
                    error: null,
                  }),
              }),
            }),
            update: updateMock,
          };
        }
        return mockDb;
      });

      const request = createMockRequest(payload);
      await POST(request);

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      delete process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
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

    it('should handle database errors gracefully', async () => {
      const payload = {
        event: 'meeting.participant_joined',
        event_ts: Date.now(),
        payload: {
          account_id: 'test-account',
          object: {
            uuid: 'test-uuid',
            id: '123456789',
            host_id: 'host-123',
            topic: 'Test Meeting',
            type: 2,
            participant: {
              user_id: 'user-123',
              user_name: 'John Doe',
              email: 'john@example.com',
              join_time: '2025-10-01T10:00:00Z',
              id: 'participant-123',
            },
          },
        },
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'registrations') {
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

      const request = createMockRequest(payload);
      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should handle event not found gracefully', async () => {
      const payload = {
        event: 'meeting.ended',
        event_ts: Date.now(),
        payload: {
          account_id: 'test-account',
          object: {
            uuid: 'test-uuid',
            id: '999999999',
            host_id: 'host-123',
            topic: 'Unknown Meeting',
            type: 2,
          },
        },
      };

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'events') {
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

      const request = createMockRequest(payload);
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.warning).toBe('Event not found');
    });
  });

  describe('Webhook Event Logging', () => {
    beforeEach(() => {
      delete process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
    });

    it('should log all webhook events to database', async () => {
      const payload = {
        event: 'meeting.started',
        event_ts: Date.now(),
        payload: {
          account_id: 'test-account',
          object: {
            uuid: 'test-uuid',
            id: '123456789',
            host_id: 'host-123',
            topic: 'Test Meeting',
            type: 2,
          },
        },
      };

      const insertMock = vi.fn(() => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'wh-123' }, error: null }),
        }),
      }));

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: insertMock,
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        return mockDb;
      });

      const request = createMockRequest(payload);
      await POST(request);

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'zoom',
          event_type: 'meeting.started',
          signature_valid: true,
        })
      );
    });

    it('should mark webhook as processed after handling', async () => {
      const payload = {
        event: 'meeting.started',
        event_ts: Date.now(),
        payload: {
          account_id: 'test-account',
          object: {
            uuid: 'test-uuid',
            id: '123456789',
            host_id: 'host-123',
            topic: 'Test Meeting',
            type: 2,
          },
        },
      };

      const updateMock = vi.fn(() => ({
        eq: () => Promise.resolve({ error: null }),
      }));

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'wh-123' }, error: null }),
              }),
            }),
            update: updateMock,
          };
        }
        return mockDb;
      });

      const request = createMockRequest(payload);
      await POST(request);

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          processed: true,
        })
      );
    });
  });
});
