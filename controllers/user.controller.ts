import { NextRequest } from 'next/server';
import { userService } from '@/services/user.service';
import { updateUserSchema } from '@/validations/auth';
import { successResponse, BadRequestError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { verifyToken } from '@/lib/auth-utils';

export function authenticate(req: NextRequest) {
  const token = req.cookies.get('session-token')?.value;
  if (!token) {
    throw new UnauthorizedError('Unauthorized: No session token found');
  }
  const payload = verifyToken(token);
  if (!payload) {
    throw new UnauthorizedError('Unauthorized: Invalid or expired token');
  }
  return payload; // { id, username, role }
}

export class UserController {
  async getAllUsers(req: NextRequest) {
    authenticate(req);
    const users = await userService.getAllUsers();
    return successResponse(users);
  }

  async getUserById(req: NextRequest, id: string) {
    authenticate(req);
    const user = await userService.getUserById(id);
    return successResponse(user);
  }

  async updateUser(req: NextRequest, id: string) {
    const currentUser = authenticate(req);

    // Authorization: User can update themselves, or Admin can update anyone.
    if (currentUser.role !== 'admin' && currentUser.id !== id) {
      throw new ForbiddenError('You are not authorized to update this user');
    }

    let body;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = updateUserSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message || 'Validation error');
    }

    // Role escalation protection: non-admins cannot change roles or user status
    if (currentUser.role !== 'admin') {
      if (validated.data.role && validated.data.role !== currentUser.role) {
        throw new ForbiddenError('Only administrators can change user roles');
      }
      if (validated.data.status) {
        throw new ForbiddenError('Only administrators can change user status');
      }
    }

    const updatedUser = await userService.updateUser(id, validated.data);
    return successResponse(updatedUser);
  }

  async deleteUser(req: NextRequest, id: string) {
    const currentUser = authenticate(req);

    // Authorization: Only administrators can delete users
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('Only administrators can delete users');
    }

    const result = await userService.deleteUser(id);
    return successResponse(result);
  }
}

export const userController = new UserController();
