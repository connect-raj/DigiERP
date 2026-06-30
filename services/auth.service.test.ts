import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './auth.service';
import { userRepository } from '@/repositories/user.repository';
import { hashPassword } from '@/lib/auth-utils';
import { BadRequestError, UnauthorizedError } from '@/lib/errors';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('register', () => {
    it('should create a new user when username is available', async () => {
      const mockUser = {
        id: 'user-id-123',
        username: 'newuser',
        passwordHash: 'somehashedpwd',
        role: Role.user,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(userRepository, 'findByUsername').mockResolvedValue(null);
      vi.spyOn(userRepository, 'create').mockResolvedValue(mockUser);

      const result = await authService.register({
        username: 'newuser',
        password: 'password123',
        role: 'user',
      });

      expect(userRepository.findByUsername).toHaveBeenCalledWith('newuser');
      expect(userRepository.create).toHaveBeenCalled();
      expect(result).toEqual({
        id: 'user-id-123',
        username: 'newuser',
        role: Role.user,
        status: 'active',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should throw BadRequestError if username is already taken', async () => {
      const mockUser = {
        id: 'user-id-123',
        username: 'existinguser',
        passwordHash: 'somehashedpwd',
        role: Role.user,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(userRepository, 'findByUsername').mockResolvedValue(mockUser);

      await expect(
        authService.register({
          username: 'existinguser',
          password: 'password123',
          role: 'user',
        })
      ).rejects.toThrow(new BadRequestError('Username is already taken'));
    });
  });

  describe('login', () => {
    it('should return a user and token on successful credentials', async () => {
      const rawPassword = 'password123';
      const passwordHash = hashPassword(rawPassword);
      const mockUser = {
        id: 'user-id-123',
        username: 'userlogin',
        passwordHash,
        role: Role.user,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(userRepository, 'findByUsername').mockResolvedValue(mockUser);

      const result = await authService.login({
        username: 'userlogin',
        password: rawPassword,
      });

      expect(userRepository.findByUsername).toHaveBeenCalledWith('userlogin');
      expect(result.token).toBeDefined();
      expect(result.user).toEqual({
        id: 'user-id-123',
        username: 'userlogin',
        role: Role.user,
        status: 'active',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should throw UnauthorizedError if user is not found', async () => {
      vi.spyOn(userRepository, 'findByUsername').mockResolvedValue(null);

      await expect(
        authService.login({
          username: 'nonexistent',
          password: 'password123',
        })
      ).rejects.toThrow(new UnauthorizedError('Invalid username or password'));
    });

    it('should throw UnauthorizedError on incorrect password', async () => {
      const passwordHash = hashPassword('correctpassword');
      const mockUser = {
        id: 'user-id-123',
        username: 'userlogin',
        passwordHash,
        role: Role.user,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(userRepository, 'findByUsername').mockResolvedValue(mockUser);

      await expect(
        authService.login({
          username: 'userlogin',
          password: 'wrongpassword',
        })
      ).rejects.toThrow(new UnauthorizedError('Invalid username or password'));
    });

    it('should throw UnauthorizedError if user status is not active', async () => {
      const rawPassword = 'password123';
      const passwordHash = hashPassword(rawPassword);
      const mockUser = {
        id: 'user-id-123',
        username: 'userlogin',
        passwordHash,
        role: Role.user,
        status: 'inactive',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(userRepository, 'findByUsername').mockResolvedValue(mockUser);

      await expect(
        authService.login({
          username: 'userlogin',
          password: rawPassword,
        })
      ).rejects.toThrow(new UnauthorizedError('Your account status is not active'));
    });
  });
});
