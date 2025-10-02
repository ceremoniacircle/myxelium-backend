/**
 * Admin Authentication Middleware
 *
 * Higher-order function that wraps Next.js API route handlers
 * to require admin authentication via JWT
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminToken, AuthError, isAdminAuthEnabled, AdminUser } from '@/lib/auth/admin-auth';

/**
 * Route handler type for Next.js App Router
 * Supports both parameterized and non-parameterized routes
 */
export type RouteHandler<TParams = {}> = (
  request: NextRequest,
  context?: { params: Promise<TParams> }
) => Promise<NextResponse> | NextResponse;

/**
 * Extended route handler with authenticated user context
 */
export type AuthenticatedRouteHandler<TParams = {}> = (
  request: NextRequest,
  context: { params?: Promise<TParams>; user: AdminUser }
) => Promise<NextResponse> | NextResponse;

/**
 * Error response format for authentication failures
 */
interface AuthErrorResponse {
  error: string;
  message: string;
  code: string;
}

/**
 * Wrap a route handler to require admin authentication
 *
 * @param handler - The route handler to protect
 * @returns Protected route handler that validates JWT before execution
 *
 * @example
 * ```typescript
 * export const GET = requireAdmin(async (request, { user }) => {
 *   // user is guaranteed to be an authenticated admin
 *   console.log('Authenticated admin:', user.email);
 *   return NextResponse.json({ data: sensitiveData });
 * });
 * ```
 */
export function requireAdmin<TParams = {}>(
  handler: AuthenticatedRouteHandler<TParams>
): RouteHandler<TParams> {
  return async (request: NextRequest, context?: { params: Promise<TParams> }) => {
    try {
      // Check if admin auth is enabled (feature flag)
      if (!isAdminAuthEnabled()) {
        console.warn('[require-admin] Admin authentication is disabled via ADMIN_AUTH_ENABLED flag');
        // If disabled, call handler without user context (backward compatibility)
        // In production, this should always be enabled
        return handler(request, { params: context?.params, user: {} as AdminUser });
      }

      // Validate JWT token and get admin user
      const user = await validateAdminToken(request);

      // Add user to context and call the handler
      return handler(request, {
        params: context?.params,
        user
      });

    } catch (error) {
      // Handle authentication errors
      if (error instanceof AuthError) {
        const errorResponse: AuthErrorResponse = {
          error: error.statusCode === 401 ? 'Unauthorized' : 'Forbidden',
          message: error.message,
          code: error.code
        };

        return NextResponse.json(errorResponse, {
          status: error.statusCode,
          headers: {
            'WWW-Authenticate': 'Bearer realm="Admin API"'
          }
        });
      }

      // Handle unexpected errors
      console.error('[require-admin] Unexpected error:', error);

      const errorResponse: AuthErrorResponse = {
        error: 'Internal Server Error',
        message: 'An error occurred during authentication',
        code: 'INTERNAL_ERROR'
      };

      return NextResponse.json(errorResponse, { status: 500 });
    }
  };
}

/**
 * Helper to check if request is authenticated (for conditional logic)
 * Does NOT throw errors, returns boolean
 */
export async function isAuthenticated(request: Request): Promise<boolean> {
  try {
    await validateAdminToken(request);
    return true;
  } catch {
    return false;
  }
}
