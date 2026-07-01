import { NextRequest } from 'next/server';
import { authService } from '@/services/auth.service';
import { registerSchema, loginSchema } from '@/validations/auth';
import { successResponse, BadRequestError } from '@/lib/errors';

export class AuthController {
  async register(req: NextRequest) {
    let body;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = registerSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message || 'Validation error');
    }

    const user = await authService.register(validated.data);
    return successResponse(user, 201);
  }

  async login(req: NextRequest) {
    let body;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = loginSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message || 'Validation error');
    }

    const result = await authService.login(validated.data);

    const response = successResponse({ user: result.user });

    // Set cookie on response
    response.cookies.set('session-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  }

  async logout() {
    const response = successResponse({ message: 'Logged out successfully' });
    response.cookies.set('session-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  }
}

export const authController = new AuthController();
