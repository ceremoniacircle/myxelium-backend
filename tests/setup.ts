/**
 * Vitest global setup
 * Runs before all tests
 *
 * Note: Environment variables are set in vitest.config.ts
 */

import { afterAll, vi } from 'vitest';

afterAll(() => {
  vi.clearAllMocks();
});
