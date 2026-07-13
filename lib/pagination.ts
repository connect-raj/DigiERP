export const DEFAULT_PAGE_LIMIT = 5;

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

/** Parses `page`/`limit` query params, defaulting to page 1 / DEFAULT_PAGE_LIMIT. */
export function parsePagination(searchParams: URLSearchParams): Pagination {
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.max(1, Number(searchParams.get('limit')) || DEFAULT_PAGE_LIMIT);
  return { page, limit, skip: (page - 1) * limit, take: limit };
}
