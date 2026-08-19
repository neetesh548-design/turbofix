import { describe, it, expect } from 'vitest';
import { findSimilarFixes } from '../utils/similarFixes';

const closedTicket = (overrides = {}) => ({
  id: 'T1',
  machine_id: 'M001',
  status: 'closed',
  issue_text: 'Spindle making a grinding noise during operation',
  repair_action: 'Replaced worn spindle bearing and re-greased',
  resolved_at: '2026-06-01T10:00:00Z',
  ...overrides,
});

describe('findSimilarFixes', () => {
  it('returns nothing for a very short query', () => {
    expect(findSimilarFixes({ issueText: 'no', tickets: [closedTicket()] })).toEqual([]);
  });

  it('returns nothing when there are no tickets', () => {
    expect(findSimilarFixes({ issueText: 'spindle grinding noise', tickets: [] })).toEqual([]);
  });

  it('ignores tickets that are still open', () => {
    const tickets = [closedTicket({ status: 'open' })];
    expect(findSimilarFixes({ issueText: 'spindle grinding noise', tickets })).toEqual([]);
  });

  it('ignores closed tickets with no repair_action or root_cause recorded', () => {
    const tickets = [closedTicket({ repair_action: '', root_cause: '' })];
    expect(findSimilarFixes({ issueText: 'spindle grinding noise', tickets })).toEqual([]);
  });

  it('ignores tickets whose issue text has no real overlap, even on the same machine', () => {
    const tickets = [closedTicket({ machine_id: 'M001', issue_text: 'Coolant tank empty, needs refill' })];
    const result = findSimilarFixes({ issueText: 'spindle grinding noise', machine: { id: 'M001' }, tickets });
    expect(result).toEqual([]);
  });

  it('matches on text similarity alone, even on a different machine', () => {
    const tickets = [closedTicket({ machine_id: 'M999' })];
    const result = findSimilarFixes({ issueText: 'hearing a grinding noise from the spindle', machine: { id: 'M001' }, tickets });
    expect(result).toHaveLength(1);
    expect(result[0].sameMachine).toBe(false);
    expect(result[0].repairAction).toBe('Replaced worn spindle bearing and re-greased');
  });

  it('boosts and flags a same-machine match', () => {
    const tickets = [closedTicket({ machine_id: 'M001' })];
    const result = findSimilarFixes({ issueText: 'spindle grinding noise again', machine: { id: 'M001' }, tickets });
    expect(result[0].sameMachine).toBe(true);
  });

  it('falls back to root_cause when repair_action is empty', () => {
    const tickets = [closedTicket({ repair_action: '', root_cause: 'Bearing wear from insufficient lubrication schedule' })];
    const result = findSimilarFixes({ issueText: 'spindle grinding noise', tickets });
    expect(result[0].rootCause).toBe('Bearing wear from insufficient lubrication schedule');
  });

  it('accepts machine_id directly instead of a machine object', () => {
    const tickets = [closedTicket({ machine_id: 'M001' })];
    const result = findSimilarFixes({ issueText: 'spindle grinding noise', machine: { machine_id: 'M001' }, tickets });
    expect(result[0].sameMachine).toBe(true);
  });

  it('sorts best match first and respects the limit', () => {
    const tickets = [
      closedTicket({ id: 'A', machine_id: 'M001', issue_text: 'Spindle grinding noise' }),
      closedTicket({ id: 'B', machine_id: 'M001', issue_text: 'Spindle grinding noise during heavy cuts specifically' }),
      closedTicket({ id: 'C', machine_id: 'M999', issue_text: 'Slight grinding sound' }),
    ];
    const result = findSimilarFixes({ issueText: 'spindle grinding noise', machine: { id: 'M001' }, tickets, limit: 2 });
    expect(result).toHaveLength(2);
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
  });

  it('returns an honest empty array rather than guessing when nothing clears the bar', () => {
    const tickets = [closedTicket({ issue_text: 'Completely unrelated topic about paint peeling' })];
    expect(findSimilarFixes({ issueText: 'spindle grinding noise', tickets })).toEqual([]);
  });
});
