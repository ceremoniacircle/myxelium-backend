/**
 * Admin Authentication Helper
 *
 * Validates JWT tokens for admin API access using Supabase Auth
 */

import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role for JWT validation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  user_metadata?: any;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: 'MISSING_TOKEN' | 'INVALID_TOKEN' | 'INSUFFICIENT_PERMISSIONS',
    public statusCode: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Extract JWT token from Authorization header
 */
export function extractToken(request: Request): string {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    throw new AuthError(
      'Missing authentication token',
      'MISSING_TOKEN',
      401
    );
  }

  // Support both "Bearer <token>" and plain token
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  if (!token) {
    throw new AuthError(
      'Invalid authorization header format',
      'MISSING_TOKEN',
      401
    );
  }

  return token;
}

/**
 * Validate admin JWT token and return user info
 *
 * @param request - The incoming request
 * @returns AdminUser object if valid
 * @throws AuthError if invalid or insufficient permissions
 */
export async function validateAdminToken(request: Request): Promise<AdminUser> {
  const startTime = Date.now();

  try {
    // Extract token from Authorization header
    const token = extractToken(request);

    // Validate token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new AuthError(
        'Invalid or expired authentication token',
        'INVALID_TOKEN',
        401
      );
    }

    // Check user role from user_metadata
    // Role can be in user_metadata.role or app_metadata.role (Supabase)
    const role = user.user_metadata?.role || user.app_metadata?.role;

    if (!role || role !== 'admin') {
      throw new AuthError(
        'Insufficient permissions. Admin role required.',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }

    // Log validation time for performance monitoring
    const duration = Date.now() - startTime;
    if (duration > 100) {
      console.warn(`[admin-auth] JWT validation took ${duration}ms (threshold: 100ms)`);
    }

    return {
      id: user.id,
      email: user.email || '',
      role,
      user_metadata: user.user_metadata
    };

  } catch (error) {
    // Re-throw AuthErrors as-is
    if (error instanceof AuthError) {
      throw error;
    }

    // Log unexpected errors
    console.error('[admin-auth] Unexpected error during token validation:', error);

    throw new AuthError(
      'Authentication failed',
      'INVALID_TOKEN',
      401
    );
  }
}

/**
 * Check if feature flag for admin auth is enabled
 * Allows gradual rollout of authentication
 */
export function isAdminAuthEnabled(): boolean {
  return process.env.ADMIN_AUTH_ENABLED !== 'false';
}
