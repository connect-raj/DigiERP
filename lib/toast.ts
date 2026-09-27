import { toast } from 'sonner';

/**
 * Shared toast helpers wrapping sonner's `toast`.
 *
 * `showErrorToast` extracts the message from this codebase's API error
 * shape, as produced by `lib/asyncHandler.ts`:
 *   { error: { code, message, details? } }
 * and mirrors the `error.error?.message ?? error.message` fallback pattern
 * already used in client pages (see app/(dashboard)/products/page.tsx).
 */

export function showSuccessToast(message: string): void {
  toast.success(message);
}

export function showErrorToast(error: unknown, fallback = 'Something went wrong.'): void {
  let message: string | undefined;

  if (error && typeof error === 'object') {
    const err = error as { error?: { message?: string }; message?: string };
    message = err.error?.message ?? err.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  toast.error(message ?? fallback);
}
