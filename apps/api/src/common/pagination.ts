export const LIST_DEFAULT_PAGE = 1;
export const LIST_DEFAULT_LIMIT = 20;
export const LIST_MAX_LIMIT = 500;

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function paginateMeta(
  total: number,
  page: number,
  limit: number,
): Pick<PaginatedResult<unknown>, 'total' | 'page' | 'limit' | 'totalPages'> {
  return {
    total,
    page,
    limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}
