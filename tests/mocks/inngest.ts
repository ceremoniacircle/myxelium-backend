/**
 * Inngest mock utilities
 */

import { vi } from 'vitest';

export const createMockInngestClient = () => {
  const sentEvents: any[] = [];

  return {
    send: vi.fn(async (event: any) => {
      sentEvents.push(event);
      return { ids: [event.name + '-' + Date.now()] };
    }),
    __getSentEvents: () => sentEvents,
    __clearSentEvents: () => {
      sentEvents.length = 0;
    },
  };
};

export type MockInngestClient = ReturnType<typeof createMockInngestClient>;

export const createMockInngestFunction = () => {
  return {
    id: vi.fn(),
    name: vi.fn(),
    run: vi.fn(),
  };
};
