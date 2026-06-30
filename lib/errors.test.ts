import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  InternalServerError,
} from './errors';

describe('AppError classes', () => {
  it('should instantiate base AppError with status code and message', () => {
    const err = new AppError(418, 'I am a teapot');
    expect(err.statusCode).toBe(418);
    expect(err.message).toBe('I am a teapot');
    expect(err.name).toBe('AppError');
  });

  it('should instantiate BadRequestError with default or custom message', () => {
    const errDefault = new BadRequestError();
    expect(errDefault.statusCode).toBe(400);
    expect(errDefault.message).toBe('Bad Request');

    const errCustom = new BadRequestError('Custom bad request');
    expect(errCustom.message).toBe('Custom bad request');
  });

  it('should instantiate UnauthorizedError', () => {
    const err = new UnauthorizedError('Custom unauth');
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Custom unauth');
  });

  it('should instantiate ForbiddenError', () => {
    const err = new ForbiddenError('Custom forbid');
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Custom forbid');
  });

  it('should instantiate NotFoundError', () => {
    const err = new NotFoundError('Custom notfound');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Custom notfound');
  });

  it('should instantiate InternalServerError', () => {
    const err = new InternalServerError('Custom internal');
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe('Custom internal');
  });
});
