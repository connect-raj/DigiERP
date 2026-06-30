import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, signToken, verifyToken } from './auth-utils';

describe('Auth Utilities', () => {
  describe('Password Hashing & Verification', () => {
    it('should generate a hashed string with salt-colon-hash format', () => {
      const password = 'my-super-secret-password';
      const hash = hashPassword(password);

      expect(hash).toContain(':');
      const parts = hash.split(':');
      expect(parts.length).toBe(2);
      expect(parts[0]).toHaveLength(32); // Hex salt
      expect(parts[1]).toHaveLength(128); // Hex SHA-512 hash
    });

    it('should verify the correct password and reject incorrect ones', () => {
      const password = 'my-super-secret-password';
      const hash = hashPassword(password);

      expect(verifyPassword(password, hash)).toBe(true);
      expect(verifyPassword('wrong-password', hash)).toBe(false);
    });

    it('should return false if the stored hash has invalid format', () => {
      expect(verifyPassword('password', 'invalidhash')).toBe(false);
      expect(verifyPassword('password', 'salt:')).toBe(false);
    });
  });

  describe('JWT Stateless Tokens', () => {
    it('should sign and verify a payload successfully', () => {
      const payload = { userId: '123', role: 'admin' };
      const token = signToken(payload);

      expect(token).toContain('.');
      const decoded = verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded!.userId).toBe('123');
      expect(decoded!.role).toBe('admin');
    });

    it('should return null for malformed tokens', () => {
      expect(verifyToken('invalid-token')).toBeNull();
      expect(verifyToken('part1.part2')).toBeNull();
    });

    it('should return null for tokens with invalid signatures', () => {
      const payload = { userId: '123' };
      const token = signToken(payload);

      // Corrupt signature
      const parts = token.split('.');
      const corruptedToken = `${parts[0]}.${parts[1]}.corruptedsignature`;

      expect(verifyToken(corruptedToken)).toBeNull();
    });
  });
});
