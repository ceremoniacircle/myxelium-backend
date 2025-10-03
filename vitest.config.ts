import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    env: {
      NODE_ENV: 'test',
      SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      INNGEST_SIGNING_KEY: 'signkey-test-12345',
      INNGEST_EVENT_KEY: 'test-event-key',
      ZOOM_ACCOUNT_ID: 'test-account-id',
      ZOOM_CLIENT_ID: 'test-client-id',
      ZOOM_CLIENT_SECRET: 'test-client-secret',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.config.{ts,js}',
        '**/types/**',
        '**/*.d.ts',
      ],
    },
    mockReset: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
