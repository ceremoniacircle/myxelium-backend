/**
 * Tests for Admin Authentication Helper
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extractToken, AuthError, isAdminAuthEnabled } from '@/lib/auth/admin-auth';

// Mock Supabase client
const mockGetUser = vi.fn();
vi.mock('@supabase/supabase-js', () => {
  // Use a factory function to avoid hoisting issues
  return {
    createClient: vi.fn(() => ({
      auth: {
        getUser: (...args: any[]) => mockGetUser(...args)
      }
    }))
  };
});

describe('Admin Auth Helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractToken', () => {
    it('should extract token from Bearer authorization header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'Authorization': 'Bearer test-token-123'
        }
      });

      const token = extractToken(request);
      expect(token).toBe('test-token-123');
    });

    it('should extract token from plain authorization header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'Authorization': 'test-token-456'
        }
      });

      const token = extractToken(request);
      expect(token).toBe('test-token-456');
    });

    it('should throw MISSING_TOKEN error when no authorization header', () => {
      const request = new Request('http://localhost');

      expect(() => extractToken(request)).toThrow(AuthError);
      expect(() => extractToken(request)).toThrow('Missing authentication token');
    });

    it('should throw MISSING_TOKEN error when authorization header is empty', () => {
      const request = new Request('http://localhost', {
        headers: {
          'Authorization': ''
        }
      });

      expect(() => extractToken(request)).toThrow(AuthError);
    });

    it('should not throw when only Bearer without space (headers API trims)', () => {
      // Note: The Request headers API automatically trims values,
      // so "Bearer " becomes "Bearer" and is treated as a plain token
      const request = new Request('http://localhost', {
        headers: {
          'Authorization': 'Bearer'
        }
      });

      const token = extractToken(request);
      expect(token).toBe('Bearer'); // Treated as plain token, not Bearer prefix
    });
  });

  describe('validateAdminToken', () => {
    it('should validate admin token successfully', async () => {
      const { validateAdminToken } = await import('@/lib/auth/admin-auth');

      const request = new Request('http://localhost', {
        headers: {
          'Authorization': 'Bearer valid-admin-token'
        }
      });

      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'admin@example.com',
            user_metadata: {
              role: 'admin'
            }
          }
        },
        error: null
      });

      const user = await validateAdminToken(request);

      expect(user).toEqual({
        id: 'user-123',
        email: 'admin@example.com',
        role: 'admin',
        user_metadata: {
          role: 'admin'
        }
      });

      expect(mockGetUser).toHaveBeenCalledWith('valid-admin-token');
    });

    it('should validate admin token with role in app_metadata', async () => {
      const { validateAdminToken } = await import('@/lib/auth/admin-auth');

      const request = new Request('http://localhost', {
        headers: {
          'Authorization': 'Bearer valid-admin-token'
        }
      });

      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'admin@example.com',
            user_metadata: {},
            app_metadata: {
              role: 'admin'
            }
          }
        },
        error: null
      });

      const user = await validateAdminToken(request);

      expect(user.role).toBe('admin');
    });

    it('should throw INVALID_TOKEN error for invalid token', async () => {
      const { validateAdminToken } = await import('@/lib/auth/admin-auth');

      const request = new Request('http://localhost', {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      });

      await expect(validateAdminToken(request)).rejects.toThrow(AuthError);
      await expect(validateAdminToken(request)).rejects.toThrow('Invalid or expired authentication token');
    });

    it('should throw INVALID_TOKEN error when user is null', async () => {
      const { validateAdminToken } = await import('@/lib/auth/admin-auth');

      const request = new Request('http://localhost', {
        headers: {
          'Authorization': 'Bearer expired-token'
        }
      });

      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      await expect(validateAdminToken(request)).rejects.toThrow(AuthError);
    });

    it('should throw INSUFFICIENT_PERMISSIONS error for non-admin user', async () => {
      const { validateAdminToken } = await import('@/lib/auth/admin-auth');

      const request = new Request('http://localhost', {
        headers: {
          'Authorization': 'Bearer user-token'
        }
      });

      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-456',
            email: 'user@example.com',
            user_metadata: {
              role: 'user'
            }
          }
        },
        error: null
      });

      await expect(validateAdminToken(request)).rejects.toThrow(AuthError);
      await expect(validateAdminToken(request)).rejects.toThrow('Insufficient permissions');
    });

    it('should throw INSUFFICIENT_PERMISSIONS error when no role assigned', async () => {
      const { validateAdminToken } = await import('@/lib/auth/admin-auth');

      const request = new Request('http://localhost', {
        headers: {
          'Authorization': 'Bearer token-no-role'
        }
      });

      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-789',
            email: 'norole@example.com',
            user_metadata: {}
          }
        },
        error: null
      });

      await expect(validateAdminToken(request)).rejects.toThrow(AuthError);
      await expect(validateAdminToken(request)).rejects.toThrow('Insufficient permissions');
    });

    it('should handle Supabase errors gracefully', async () => {
      const { validateAdminToken } = await import('@/lib/auth/admin-auth');

      const request = new Request('http://localhost', {
        headers: {
          'Authorization': 'Bearer error-token'
        }
      });

      mockGetUser.mockRejectedValue(new Error('Database connection failed'));

      await expect(validateAdminToken(request)).rejects.toThrow(AuthError);
      await expect(validateAdminToken(request)).rejects.toThrow('Authentication failed');
    });

    it('should warn if validation takes more than 100ms', async () => {
      const { validateAdminToken } = await import('@/lib/auth/admin-auth');
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const request = new Request('http://localhost', {
        headers: {
          'Authorization': 'Bearer slow-token'
        }
      });

      // Simulate slow validation
      mockGetUser.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          data: {
            user: {
              id: 'user-123',
              email: 'admin@example.com',
              user_metadata: { role: 'admin' }
            }
          },
          error: null
        }), 150))
      );

      await validateAdminToken(request);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[admin-auth] JWT validation took')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('isAdminAuthEnabled', () => {
    it('should return true when ADMIN_AUTH_ENABLED is not set', () => {
      delete process.env.ADMIN_AUTH_ENABLED;
      expect(isAdminAuthEnabled()).toBe(true);
    });

    it('should return true when ADMIN_AUTH_ENABLED is true', () => {
      process.env.ADMIN_AUTH_ENABLED = 'true';
      expect(isAdminAuthEnabled()).toBe(true);
    });

    it('should return false when ADMIN_AUTH_ENABLED is false', () => {
      process.env.ADMIN_AUTH_ENABLED = 'false';
      expect(isAdminAuthEnabled()).toBe(false);
    });
  });

  describe('AuthError', () => {
    it('should create AuthError with correct properties', () => {
      const error = new AuthError('Test error', 'INVALID_TOKEN', 401);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('INVALID_TOKEN');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthError');
    });
  });
});
