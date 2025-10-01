/**
 * Supabase mock utilities
 */

import { vi } from 'vitest';

export const createMockSupabaseClient = () => {
  const mockData = {
    contacts: [] as any[],
    events: [] as any[],
    registrations: [] as any[],
    message_sends: [] as any[],
  };

  const createQueryBuilder = (table: keyof typeof mockData) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockData[table][0] || null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: mockData[table][0] || null, error: null }),
  });

  return {
    from: vi.fn((table: keyof typeof mockData) => createQueryBuilder(table)),
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
    // Helper to set mock data
    __setMockData: (table: keyof typeof mockData, data: any[]) => {
      mockData[table] = data;
    },
    __getMockData: (table: keyof typeof mockData) => mockData[table],
  };
};

export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
