import type { PaginatedResult } from '@/types/api';

const PAGE_LIMIT = 500;

export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<PaginatedResult<T>>,
  signal?: AbortSignal,
): Promise<T[]> {
  const first = await fetchPage(1, PAGE_LIMIT);
  const items = [...first.data];
  const totalPages = first.totalPages;

  for (let page = 2; page <= totalPages; page += 1) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    const next = await fetchPage(page, PAGE_LIMIT);
    items.push(...next.data);
  }

  return items;
}
