/**
 * Vitest global setup
 * Runs before all tests
 */

import { beforeAll, afterAll, vi } from 'vitest';

// Set environment variables IMMEDIATELY (before any module imports)
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.INNGEST_SIGNING_KEY = 'signkey-test-12345';
process.env.INNGEST_EVENT_KEY = 'test-event-key';
process.env.ZOOM_ACCOUNT_ID = 'test-account-id';
process.env.ZOOM_CLIENT_ID = 'test-client-id';
process.env.ZOOM_CLIENT_SECRET = 'test-client-secret';

afterAll(() => {
  vi.clearAllMocks();
});
