/**
 * Test helper for mocking authentication in admin API tests
 */

/**
 * Creates a mock request with valid admin authentication
 */
export function createAuthenticatedRequest(
  url: string,
  options: RequestInit = {}
): Request {
  const headers = new Headers(options.headers);
  headers.set('Authorization', 'Bearer mock-admin-token');

  return new Request(url, {
    ...options,
    headers,
  });
}

/**
 * Creates a mock request without authentication
 */
export function createUnauthenticatedRequest(
  url: string,
  options: RequestInit = {}
): Request {
  return new Request(url, options);
}

/**
 * Creates a mock request with invalid token
 */
export function createInvalidTokenRequest(
  url: string,
  options: RequestInit = {}
): Request {
  const headers = new Headers(options.headers);
  headers.set('Authorization', 'Bearer invalid-token');

  return new Request(url, {
    ...options,
    headers,
  });
}

/**
 * Creates a mock request with non-admin user token
 */
export function createNonAdminRequest(
  url: string,
  options: RequestInit = {}
): Request {
  const headers = new Headers(options.headers);
  headers.set('Authorization', 'Bearer mock-viewer-token');

  return new Request(url, {
    ...options,
    headers,
  });
}

/**
 * Setup mock for Supabase auth to return admin user
 */
export function mockAdminAuth(mockGetUser: any) {
  mockGetUser.mockResolvedValue({
    data: {
      user: {
        id: 'admin-user-id',
        email: 'admin@example.com',
        user_metadata: {
          role: 'admin'
        }
      }
    },
    error: null
  });
}

/**
 * Setup mock for Supabase auth to return non-admin user
 */
export function mockNonAdminAuth(mockGetUser: any) {
  mockGetUser.mockResolvedValue({
    data: {
      user: {
        id: 'viewer-user-id',
        email: 'viewer@example.com',
        user_metadata: {
          role: 'viewer'
        }
      }
    },
    error: null
  });
}

/**
 * Setup mock for Supabase auth to return invalid token error
 */
export function mockInvalidTokenAuth(mockGetUser: any) {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'Invalid token' }
  });
}

/**
 * Setup mock for Supabase auth to return no user
 */
export function mockNoUserAuth(mockGetUser: any) {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: null
  });
}
