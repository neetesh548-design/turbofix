import { describe, it, expect } from 'vitest';

export const VALID_TRANSITIONS = {
  Open: ['Assigned', 'Cancelled'],
  Assigned: ['Accepted', 'Reassigned', 'Open'],
  Accepted: ['In Progress', 'Waiting for Spare'],
  'In Progress': ['Waiting for Spare', 'Resolved'],
  'Waiting for Spare': ['In Progress', 'Resolved'],
  Resolved: ['Verified', 'Rejected'],
  Verified: ['Closed', 'Reopened'],
  Rejected: ['In Progress', 'Reassigned'],
  Closed: ['Reopened'],
  Reopened: ['Assigned', 'In Progress'],
};

export function canTransitionTicket(currentStatus, targetStatus, userRole, hasVerificationEvidence = false) {
  if (!currentStatus || !targetStatus) return { allowed: false, reason: 'Invalid status provided' };
  
  const allowedNext = VALID_TRANSITIONS[currentStatus];
  if (!allowedNext || !allowedNext.includes(targetStatus)) {
    return { allowed: false, reason: `Cannot transition directly from ${currentStatus} to ${targetStatus}` };
  }

  // Independent verification enforcement
  if (currentStatus === 'Resolved' && targetStatus === 'Verified') {
    if (!hasVerificationEvidence) {
      return { allowed: false, reason: 'Verification requires mandatory photo evidence and notes' };
    }
  }

  // Closure requires supervisor or owner authority
  if (targetStatus === 'Closed' || targetStatus === 'Verified') {
    if (userRole === 'technician') {
      return { allowed: false, reason: 'Independent supervisor verification required for closure' };
    }
  }

  return { allowed: true };
}

describe('Ticket Lifecycle State Machine Tests (Section 4.3 & 11)', () => {
  describe('Valid State Transitions', () => {
    it('allows valid sequential workflow from Open to Closed', () => {
      expect(canTransitionTicket('Open', 'Assigned', 'supervisor')).toEqual({ allowed: true });
      expect(canTransitionTicket('Assigned', 'Accepted', 'technician')).toEqual({ allowed: true });
      expect(canTransitionTicket('Accepted', 'In Progress', 'technician')).toEqual({ allowed: true });
      expect(canTransitionTicket('In Progress', 'Resolved', 'technician')).toEqual({ allowed: true });
      expect(canTransitionTicket('Resolved', 'Verified', 'supervisor', true)).toEqual({ allowed: true });
      expect(canTransitionTicket('Verified', 'Closed', 'supervisor')).toEqual({ allowed: true });
    });

    it('allows transitioning from In Progress to Waiting for Spare', () => {
      expect(canTransitionTicket('In Progress', 'Waiting for Spare', 'technician')).toEqual({ allowed: true });
    });

    it('allows reopening a Closed ticket', () => {
      expect(canTransitionTicket('Closed', 'Reopened', 'owner')).toEqual({ allowed: true });
    });
  });

  describe('Invalid State Transitions & Safety Controls', () => {
    it('blocks direct transition from Open to Closed', () => {
      const res = canTransitionTicket('Open', 'Closed', 'owner');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Cannot transition directly');
    });

    it('blocks direct transition from In Progress to Closed without resolution & verification', () => {
      const res = canTransitionTicket('In Progress', 'Closed', 'owner');
      expect(res.allowed).toBe(false);
    });

    it('blocks technician from verifying or closing their own ticket', () => {
      const res = canTransitionTicket('Verified', 'Closed', 'technician');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Independent supervisor verification required');
    });

    it('blocks verification if mandatory photo evidence is missing', () => {
      const res = canTransitionTicket('Resolved', 'Verified', 'supervisor', false);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Verification requires mandatory photo evidence');
    });
  });

  describe('Null Safety & Edge Cases', () => {
    it('handles null or undefined currentStatus gracefully', () => {
      expect(canTransitionTicket(null, 'Closed', 'owner')).toHaveProperty('allowed', false);
      expect(canTransitionTicket('Open', undefined, 'owner')).toHaveProperty('allowed', false);
    });

    it('handles unknown status values gracefully', () => {
      expect(canTransitionTicket('UNKNOWN_STATUS', 'Closed', 'owner')).toHaveProperty('allowed', false);
    });
  });
});
