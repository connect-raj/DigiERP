import { userRepository } from '@/repositories/user.repository';
import { hashPassword, omitPassword } from '@/lib/auth-utils';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import { UpdateUserInput } from '@/validations/auth';

export class UserService {
  async getAllUsers() {
    const users = await userRepository.findAll();
    return users.map((user) => omitPassword(user));
  }

  async getUserById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return omitPassword(user);
  }

  async updateUser(id: string, input: UpdateUserInput) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updateData: Parameters<typeof userRepository.update>[1] = {};

    if (input.username && input.username !== user.username) {
      const existingUser = await userRepository.findByUsername(input.username);
      if (existingUser) {
        throw new BadRequestError('Username is already taken');
      }
      updateData.username = input.username;
    }

    if (input.password) {
      updateData.passwordHash = hashPassword(input.password);
    }

    if (input.role) {
      updateData.role = input.role;
    }

    if (input.status) {
      updateData.status = input.status;
    }

    const updatedUser = await userRepository.update(id, updateData);
    return omitPassword(updatedUser);
  }

  async deleteUser(id: string) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await userRepository.deleteUser(id);
    return { success: true };
  }
}

export const userService = new UserService();
