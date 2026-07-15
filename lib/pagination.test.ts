import { describe, it, expect } from 'vitest';
import { parsePagination, DEFAULT_PAGE_LIMIT } from './pagination';

describe('parsePagination', () => {
  it('defaults to page 1 and DEFAULT_PAGE_LIMIT (20) with skip 0', () => {
    expect(DEFAULT_PAGE_LIMIT).toBe(20);
    const result = parsePagination(new URLSearchParams());
    expect(result).toEqual({ page: 1, limit: 20, skip: 0, take: 20 });
  });

  it('honours explicit page and limit and computes skip', () => {
    const result = parsePagination(new URLSearchParams({ page: '3', limit: '10' }));
    expect(result).toEqual({ page: 3, limit: 10, skip: 20, take: 10 });
  });

  it('clamps invalid page and negative limit to at least 1', () => {
    const result = parsePagination(new URLSearchParams({ page: '0', limit: '-5' }));
    expect(result.page).toBe(1);
    expect(result.limit).toBe(1);
  });

  it('falls back to the default limit when limit is non-numeric', () => {
    const result = parsePagination(new URLSearchParams({ limit: 'abc' }));
    expect(result.limit).toBe(DEFAULT_PAGE_LIMIT);
  });
});
