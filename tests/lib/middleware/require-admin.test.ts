/**
 * Tests for Admin Authentication Middleware
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/require-admin';
import { AuthError } from '@/lib/auth/admin-auth';

// Mock the admin-auth module
vi.mock('@/lib/auth/admin-auth', () => ({
  validateAdminToken: vi.fn(),
  isAdminAuthEnabled: vi.fn(() => true),
  AuthError: class AuthError extends Error {
    constructor(
      message: string,
      public code: string,
      public statusCode: number
    ) {
      super(message);
      this.name = 'AuthError';
    }
  }
}));

describe('requireAdmin Middleware', () => {
  let mockValidateAdminToken: any;
  let mockIsAdminAuthEnabled: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const authModule = await import('@/lib/auth/admin-auth');
    mockValidateAdminToken = authModule.validateAdminToken as any;
    mockIsAdminAuthEnabled = authModule.isAdminAuthEnabled as any;

    // Default to auth enabled
    mockIsAdminAuthEnabled.mockReturnValue(true);
  });

  describe('Successful Authentication', () => {
    it('should call handler with authenticated user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'admin',
        user_metadata: { role: 'admin' }
      };

      mockValidateAdminToken.mockResolvedValue(mockUser);

      const mockHandler = vi.fn(async (req, { user }) => {
        return NextResponse.json({ message: 'Success', user: user.email });
      });

      const protectedHandler = requireAdmin(mockHandler);

      const request = new NextRequest('http://localhost/api/admin/test', {
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const response = await protectedHandler(request);
      const json = await response.json();

      expect(mockHandler).toHaveBeenCalled();
      expect(json.message).toBe('Success');
      expect(json.user).toBe('admin@example.com');
    });

    it('should pass params to handler', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'admin'
      };

      mockValidateAdminToken.mockResolvedValue(mockUser);

      const mockHandler = vi.fn(async (req, { params, user }) => {
        const { id } = await params!;
        return NextResponse.json({ id, user: user.email });
      });

      const protectedHandler = requireAdmin(mockHandler);

      const request = new NextRequest('http://localhost/api/admin/events/123', {
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const response = await protectedHandler(request, {
        params: Promise.resolve({ id: '123' })
      });
      const json = await response.json();

      expect(json.id).toBe('123');
      expect(json.user).toBe('admin@example.com');
    });
  });

  describe('Authentication Failures', () => {
    it('should return 401 for missing token', async () => {
      mockValidateAdminToken.mockRejectedValue(
        new AuthError('Missing authentication token', 'MISSING_TOKEN', 401)
      );

      const mockHandler = vi.fn();
      const protectedHandler = requireAdmin(mockHandler);

      const request = new NextRequest('http://localhost/api/admin/test');

      const response = await protectedHandler(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
      expect(json.message).toBe('Missing authentication token');
      expect(json.code).toBe('MISSING_TOKEN');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      mockValidateAdminToken.mockRejectedValue(
        new AuthError('Invalid or expired authentication token', 'INVALID_TOKEN', 401)
      );

      const mockHandler = vi.fn();
      const protectedHandler = requireAdmin(mockHandler);

      const request = new NextRequest('http://localhost/api/admin/test', {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      const response = await protectedHandler(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
      expect(json.message).toBe('Invalid or expired authentication token');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should return 403 for insufficient permissions', async () => {
      mockValidateAdminToken.mockRejectedValue(
        new AuthError('Insufficient permissions. Admin role required.', 'INSUFFICIENT_PERMISSIONS', 403)
      );

      const mockHandler = vi.fn();
      const protectedHandler = requireAdmin(mockHandler);

      const request = new NextRequest('http://localhost/api/admin/test', {
        headers: {
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await protectedHandler(request);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toBe('Forbidden');
      expect(json.message).toBe('Insufficient permissions. Admin role required.');
      expect(json.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should include WWW-Authenticate header in error response', async () => {
      mockValidateAdminToken.mockRejectedValue(
        new AuthError('Missing authentication token', 'MISSING_TOKEN', 401)
      );

      const mockHandler = vi.fn();
      const protectedHandler = requireAdmin(mockHandler);

      const request = new NextRequest('http://localhost/api/admin/test');

      const response = await protectedHandler(request);

      expect(response.headers.get('WWW-Authenticate')).toBe('Bearer realm="Admin API"');
    });

    it('should return 500 for unexpected errors', async () => {
      mockValidateAdminToken.mockRejectedValue(new Error('Database connection failed'));

      const mockHandler = vi.fn();
      const protectedHandler = requireAdmin(mockHandler);

      const request = new NextRequest('http://localhost/api/admin/test', {
        headers: {
          'Authorization': 'Bearer token'
        }
      });

      const response = await protectedHandler(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('Internal Server Error');
      expect(json.message).toBe('An error occurred during authentication');
      expect(json.code).toBe('INTERNAL_ERROR');
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('Feature Flag', () => {
    it('should bypass auth when ADMIN_AUTH_ENABLED is false', async () => {
      mockIsAdminAuthEnabled.mockReturnValue(false);

      const mockHandler = vi.fn(async (req, { user }) => {
        return NextResponse.json({ message: 'Success', hasUser: !!user });
      });

      const protectedHandler = requireAdmin(mockHandler);

      const request = new NextRequest('http://localhost/api/admin/test');

      const response = await protectedHandler(request);
      const json = await response.json();

      expect(mockHandler).toHaveBeenCalled();
      expect(mockValidateAdminToken).not.toHaveBeenCalled();
      expect(json.message).toBe('Success');
    });

    it('should log warning when auth is disabled', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockIsAdminAuthEnabled.mockReturnValue(false);

      const mockHandler = vi.fn(async () => NextResponse.json({ ok: true }));
      const protectedHandler = requireAdmin(mockHandler);

      const request = new NextRequest('http://localhost/api/admin/test');

      await protectedHandler(request);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[require-admin] Admin authentication is disabled via ADMIN_AUTH_ENABLED flag'
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should log unexpected errors to console', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockValidateAdminToken.mockRejectedValue(new Error('Unexpected error'));

      const mockHandler = vi.fn();
      const protectedHandler = requireAdmin(mockHandler);

      const request = new NextRequest('http://localhost/api/admin/test', {
        headers: {
          'Authorization': 'Bearer token'
        }
      });

      await protectedHandler(request);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[require-admin] Unexpected error:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
