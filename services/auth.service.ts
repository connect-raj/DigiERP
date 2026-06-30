import { userRepository } from '@/repositories/user.repository';
import { hashPassword, verifyPassword, signToken, omitPassword } from '@/lib/auth-utils';
import { BadRequestError, UnauthorizedError } from '@/lib/errors';
import { RegisterInput, LoginInput } from '@/validations/auth';

export class AuthService {
  async register(input: RegisterInput) {
    const existingUser = await userRepository.findByUsername(input.username);
    if (existingUser) {
      throw new BadRequestError('Username is already taken');
    }

    const passwordHash = hashPassword(input.password);
    const user = await userRepository.create({
      username: input.username,
      passwordHash,
      role: input.role,
    });

    return omitPassword(user);
  }

  async login(input: LoginInput) {
    const user = await userRepository.findByUsername(input.username);
    if (!user) {
      throw new UnauthorizedError('Invalid username or password');
    }

    const isPasswordValid = verifyPassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid username or password');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedError('Your account status is not active');
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    const token = signToken(tokenPayload);

    return {
      user: omitPassword(user),
      token,
    };
  }
}

export const authService = new AuthService();
