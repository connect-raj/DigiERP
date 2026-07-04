import { NextRequest, NextResponse } from 'next/server';
import { AppError } from './errors';

type RouteHandler<T extends unknown[]> = (
  req: NextRequest,
  ...args: T
) => Promise<NextResponse> | NextResponse;

export function asyncHandler<T extends unknown[]>(handler: RouteHandler<T>) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      return await handler(req, ...args);
    } catch (error: unknown) {
      console.error('API Error:', error);

      const statusCode = error instanceof AppError ? error.statusCode : 500;
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
      const details = error instanceof AppError ? error.details : undefined;

      return NextResponse.json(
        { error: { code, message, ...(details !== undefined && { details }) } },
        { status: statusCode }
      );
    }
  };
}
