import { test, expect } from 'vitest';

import { generateChecklist } from './dynamicChecklist.js';

test('generates a short electrical checklist from machine and company context', () => {
  const checklist = generateChecklist({
    ticket: { id: 'T-1', machine_id: 'CNC-01', issue_text: 'motor panel has an electrical short' },
    machine: { id: 'CNC-01', name: 'CNC Lathe' },
  });

  expect(checklist.length).toBeLessThanOrEqual(7);
  expect(checklist[0].mandatory).toBe(true);
  expect(checklist[0].source).toMatch(/CNC Lathe/);
  expect(checklist.some((item) => item.id === 'isolate-electrical' && item.mandatory)).toBe(true);
});

test('uses approved machine data and similar successful repairs without extra input', () => {
  const checklist = generateChecklist({
    ticket: { id: 'T-2', machine_id: 'CNC-01', issue_text: 'spindle bearing noise' },
    machine: { id: 'CNC-01', name: 'CNC Lathe' },
    documents: [{ machine_id: 'CNC-01', title: 'Spindle Maintenance SOP', category: 'sop' }],
    history: [{ id: 'T-OLD', machine_id: 'CNC-01', status: 'resolved', issue_text: 'bearing noise in spindle', resolution: 'Replace bearing and verify vibration' }],
    parts: [{ machine_id: 'CNC-01', name: 'Spindle bearing', stock_qty: 2 }],
  });

  expect(checklist.some((item) => item.source === 'Approved machine data')).toBe(true);
  expect(checklist.some((item) => item.source === 'Machine repair history')).toBe(true);
  expect(checklist.some((item) => item.source === 'Live spare inventory')).toBe(true);
});

