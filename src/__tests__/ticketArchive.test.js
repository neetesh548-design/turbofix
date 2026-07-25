import { describe, it, expect } from 'vitest';
import {
  isEligibleForArchive,
  partitionTickets,
  exportArchivedTicketsCSV,
  ARCHIVE_THRESHOLD_DAYS
} from '../utils/ticketArchive';

describe('TurboFix 3-Month Closed Ticket Archiving Engine', () => {
  const now = new Date('2026-07-26T00:00:00Z');

  it('should not archive open tickets regardless of age', () => {
    const openOldTicket = {
      id: 'T-OPEN-101',
      status: 'work_started',
      created_at: '2025-01-01T00:00:00Z' // Over 1 year old but open
    };
    expect(isEligibleForArchive(openOldTicket, now)).toBe(false);
  });

  it('should not archive recently closed tickets (<90 days old)', () => {
    const recentClosedTicket = {
      id: 'T-RECENT-102',
      status: 'closed',
      closed_at: '2026-06-01T00:00:00Z' // ~55 days old
    };
    expect(isEligibleForArchive(recentClosedTicket, now)).toBe(false);
  });

  it('should archive closed tickets older than 90 days (3 months)', () => {
    const oldClosedTicket = {
      id: 'T-OLD-103',
      status: 'closed',
      closed_at: '2026-03-01T00:00:00Z' // ~147 days old (>90 days)
    };
    expect(isEligibleForArchive(oldClosedTicket, now)).toBe(true);
  });

  it('should correctly partition a mixed list of tickets', () => {
    const tickets = [
      { id: 'T1', status: 'open', created_at: '2026-07-01' },
      { id: 'T2', status: 'closed', closed_at: '2026-07-10' }, // Recent closed
      { id: 'T3', status: 'closed', closed_at: '2025-12-01' }, // Archive (>90d)
      { id: 'T4', status: 'closed', closed_at: '2026-01-15' }  // Archive (>90d)
    ];

    const { activeTickets, archivedTickets } = partitionTickets(tickets, now);

    expect(activeTickets.map((t) => t.id)).toEqual(['T1', 'T2']);
    expect(archivedTickets.map((t) => t.id)).toEqual(['T3', 'T4']);
  });

  it('should format CSV export cleanly for archived tickets', () => {
    const archived = [
      {
        id: 'T-ARCH-001',
        machine_id: 'MCH-01',
        machine_name: 'CNC Lathe',
        issue_text: 'Spindle noise',
        root_cause: 'Bearing wear',
        repair_action: 'Replaced bearing',
        urgency: 'High',
        status: 'Closed',
        created_at: '2025-10-01',
        closed_at: '2025-10-02'
      }
    ];

    const csv = exportArchivedTicketsCSV(archived);
    expect(csv).toContain('Ticket ID,Machine ID,Machine Name');
    expect(csv).toContain('"T-ARCH-001"');
    expect(csv).toContain('"CNC Lathe"');
    expect(csv).toContain('"Spindle noise"');
  });
});
