/**
 * KaizenPager — the page control strip for the Kaizen lists.
 *
 * Hides itself entirely when everything fits on one page, so a plant
 * with six ideas never sees pagination furniture. Pair it with
 * usePagedIdeas, which owns the slicing.
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function KaizenPager({ page, pageCount, total, setPage, noun = 'ideas' }) {
  if (pageCount <= 1) return null;

  return (
    <nav className="kz-pager" aria-label={`${noun} pagination`} data-testid="kaizen-pager">
      <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft size={14} />
      </button>
      <span>Page {page} of {pageCount} · {total} {noun}</span>
      <button type="button" onClick={() => setPage(page + 1)} disabled={page >= pageCount} aria-label="Next page">
        <ChevronRight size={14} />
      </button>
    </nav>
  );
}
