/**
 * usePagedIdeas — ten rows a page.
 *
 * A plant that runs Kaizen properly accumulates hundreds of ideas, and
 * rendering all of them costs both paint time and the reader's place in
 * the list. Ten is roughly one screen on a laptop and two thumb-scrolls
 * on a phone.
 *
 * Lives apart from KaizenPager so that file only exports a component
 * and keeps working with fast refresh.
 */

import { useEffect, useMemo, useState } from 'react';

export const PAGE_SIZE = 10;

export default function usePagedIdeas(items, pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);

  const rows = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));

  // Approving the last idea on page 3 must not strand the reader on an
  // empty page — clamp whenever the collection shrinks under them.
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const slice = useMemo(() => {
    const start = (Math.min(page, pageCount) - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageCount, pageSize]);

  return {
    slice,
    page: Math.min(page, pageCount),
    pageCount,
    total: rows.length,
    setPage,
    pageSize,
  };
}
