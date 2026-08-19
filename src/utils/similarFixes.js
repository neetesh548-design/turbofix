/* ===========================================================
   TurboFix — "How was this fixed last time?" at report time
   ===========================================================

   Every CMMS reviewed in this pass leads with surfacing institutional
   knowledge the moment someone reports a new breakdown — TurboFix has all
   the raw material (repair_action/root_cause on closed tickets) but
   nothing ever matched a NEW report's text against that history before
   submission. RCA.jsx does after-the-fact root-cause analysis for
   engineers; dynamicChecklist.js's similarity() matches issue text
   against SAFETY steps, not past fixes. This is neither — it's a
   report-time suggestion for whoever is filing the ticket.

   Token-overlap scoring, same technique as dynamicChecklist.js (no NLP
   dependency, good enough for short shop-floor sentences). Same machine
   gets a score bonus rather than a bypass — a past unrelated issue on the
   same machine is not "how this was fixed," it's noise.

   Pure functions only — no Supabase calls here.
   =========================================================== */

import { asArray } from './dashboardMetrics.js';
import { isTicketClosed } from './ticketSla.js';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'machine', 'issue',
  'problem', 'was', 'were', 'has', 'have', 'had', 'not', 'but', 'are',
]);

/** Same machine gets a boost; unrelated-but-same-machine history still needs real text overlap. */
const SAME_MACHINE_BONUS = 0.2;
const MIN_SCORE = 0.25;
const MIN_QUERY_LENGTH = 3;

function tokenize(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  );
}

/** Jaccard-style overlap: shared tokens over the smaller set's size, so a short query isn't penalized against a longer historical note. */
function similarity(a, b) {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (!tokensA.size || !tokensB.size) return 0;
  let shared = 0;
  tokensA.forEach((token) => { if (tokensB.has(token)) shared += 1; });
  return shared / Math.min(tokensA.size, tokensB.size);
}

function candidateText(ticket) {
  return ticket?.issue_text || ticket?.description || '';
}

function candidateFixText(ticket) {
  return ticket?.repair_action || ticket?.root_cause || '';
}

/**
 * Find the best-matching past resolved tickets for a new report.
 *
 * @param {object} args
 * @param {string} args.issueText - what the reporter has typed so far
 * @param {object} [args.machine] - the selected machine (id or machine_id)
 * @param {object[]} [args.tickets] - the candidate pool (any status; filtered here)
 * @param {number} [args.limit]
 * @returns {{ issueText: string, repairAction: string, rootCause: string, resolvedAt: string|null, sameMachine: boolean, score: number }[]}
 */
export function findSimilarFixes({ issueText, machine, tickets = [], limit = 3 } = {}) {
  const query = String(issueText || '').trim();
  if (query.length < MIN_QUERY_LENGTH) return [];

  const machineId = machine?.id || machine?.machine_id;

  const scored = asArray(tickets)
    .filter((ticket) => isTicketClosed(ticket) && candidateFixText(ticket) && candidateText(ticket))
    .map((ticket) => {
      const sameMachine = Boolean(machineId) && ticket.machine_id === machineId;
      const score = Math.min(1, similarity(query, candidateText(ticket)) + (sameMachine ? SAME_MACHINE_BONUS : 0));
      return { ticket, sameMachine, score };
    })
    .filter((row) => row.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ ticket, sameMachine, score }) => ({
    issueText: candidateText(ticket),
    repairAction: ticket.repair_action || '',
    rootCause: ticket.root_cause || '',
    resolvedAt: ticket.resolved_at || ticket.closed_at || null,
    sameMachine,
    score: Math.round(score * 100) / 100,
  }));
}
