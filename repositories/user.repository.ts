import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export class UserRepository {
  async findByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findAll() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: { username: string; passwordHash: string; role: Role; status?: string }) {
    return prisma.user.create({
      data,
    });
  }

  async update(
    id: string,
    data: { username?: string; passwordHash?: string; role?: Role; status?: string }
  ) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async deleteUser(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  }
}

export const userRepository = new UserRepository();
