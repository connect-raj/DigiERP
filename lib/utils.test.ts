import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('should merge class names correctly', () => {
    expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
  });

  it('should conditionally apply classes', () => {
    expect(cn('px-2', true && 'py-2', false && 'm-2')).toBe('px-2 py-2');
  });

  it('should merge tailwind classes gracefully', () => {
    expect(cn('p-2 p-4')).toBe('p-4');
  });
});
