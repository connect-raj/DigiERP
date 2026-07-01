import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from './user.service';
import { userRepository } from '@/repositories/user.repository';
import { NotFoundError, BadRequestError } from '@/lib/errors';
import { Role } from '@prisma/client';

describe('UserService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return all users without password hashes', async () => {
      const mockUsers = [
        {
          id: '1',
          username: 'user1',
          passwordHash: 'hash1',
          role: Role.user,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          username: 'admin1',
          passwordHash: 'hash2',
          role: Role.admin,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.spyOn(userRepository, 'findAll').mockResolvedValue(mockUsers);

      const result = await userService.getAllUsers();

      expect(userRepository.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect((result[0] as Record<string, unknown>).passwordHash).toBeUndefined();
      expect(result[0].username).toBe('user1');
      expect((result[1] as Record<string, unknown>).passwordHash).toBeUndefined();
      expect(result[1].role).toBe(Role.admin);
    });
  });

  describe('getUserById', () => {
    it('should return single user without password hash', async () => {
      const mockUser = {
        id: '1',
        username: 'user1',
        passwordHash: 'hash1',
        role: Role.user,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(userRepository, 'findById').mockResolvedValue(mockUser);

      const result = await userService.getUserById('1');

      expect(userRepository.findById).toHaveBeenCalledWith('1');
      expect((result as Record<string, unknown>).passwordHash).toBeUndefined();
      expect(result.username).toBe('user1');
    });

    it('should throw NotFoundError if user does not exist', async () => {
      vi.spyOn(userRepository, 'findById').mockResolvedValue(null);

      await expect(userService.getUserById('nonexistent')).rejects.toThrow(
        new NotFoundError('User not found')
      );
    });
  });

  describe('updateUser', () => {
    it('should update user fields successfully', async () => {
      const mockUser = {
        id: '1',
        username: 'user1',
        passwordHash: 'hash1',
        role: Role.user,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdated = {
        ...mockUser,
        username: 'updatedusername',
        role: Role.admin,
      };

      vi.spyOn(userRepository, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(userRepository, 'findByUsername').mockResolvedValue(null);
      vi.spyOn(userRepository, 'update').mockResolvedValue(mockUpdated);

      const result = await userService.updateUser('1', {
        username: 'updatedusername',
        role: Role.admin,
      });

      expect(userRepository.findById).toHaveBeenCalledWith('1');
      expect(userRepository.findByUsername).toHaveBeenCalledWith('updatedusername');
      expect(userRepository.update).toHaveBeenCalledWith('1', {
        username: 'updatedusername',
        role: Role.admin,
      });
      expect(result.username).toBe('updatedusername');
      expect(result.role).toBe(Role.admin);
      expect((result as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('should throw BadRequestError if new username is already taken', async () => {
      const mockUser = {
        id: '1',
        username: 'user1',
        passwordHash: 'hash1',
        role: Role.user,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const anotherUser = {
        id: '2',
        username: 'takenname',
        passwordHash: 'hash2',
        role: Role.user,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(userRepository, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(userRepository, 'findByUsername').mockResolvedValue(anotherUser);

      await expect(userService.updateUser('1', { username: 'takenname' })).rejects.toThrow(
        new BadRequestError('Username is already taken')
      );
    });

    it('should hash new password if provided in update input', async () => {
      const mockUser = {
        id: '1',
        username: 'user1',
        passwordHash: 'hash1',
        role: Role.user,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdated = {
        ...mockUser,
        passwordHash: 'newhashedpassword',
      };

      vi.spyOn(userRepository, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(userRepository, 'update').mockResolvedValue(mockUpdated);

      const result = await userService.updateUser('1', { password: 'newpassword123' });

      expect(userRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          passwordHash: expect.any(String),
        })
      );
      expect((result as Record<string, unknown>).passwordHash).toBeUndefined();
    });
  });

  describe('deleteUser', () => {
    it('should delete existing user successfully', async () => {
      const mockUser = {
        id: '1',
        username: 'user1',
        passwordHash: 'hash1',
        role: Role.user,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(userRepository, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(userRepository, 'deleteUser').mockResolvedValue(mockUser);

      const result = await userService.deleteUser('1');

      expect(userRepository.findById).toHaveBeenCalledWith('1');
      expect(userRepository.deleteUser).toHaveBeenCalledWith('1');
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundError on delete if user does not exist', async () => {
      vi.spyOn(userRepository, 'findById').mockResolvedValue(null);

      await expect(userService.deleteUser('nonexistent')).rejects.toThrow(
        new NotFoundError('User not found')
      );
    });
  });
});
