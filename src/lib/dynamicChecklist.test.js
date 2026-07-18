import assert from 'node:assert/strict';
import test from 'node:test';

import { generateChecklist } from './dynamicChecklist.js';

test('generates a short electrical checklist from machine and company context', () => {
  const checklist = generateChecklist({
    ticket: { id: 'T-1', machine_id: 'CNC-01', issue_text: 'motor panel has an electrical short' },
    machine: { id: 'CNC-01', name: 'CNC Lathe' },
  });

  assert.ok(checklist.length <= 7);
  assert.equal(checklist[0].mandatory, true);
  assert.match(checklist[0].source, /CNC Lathe/);
  assert.ok(checklist.some((item) => item.id === 'isolate-electrical' && item.mandatory));
});

test('uses approved machine data and similar successful repairs without extra input', () => {
  const checklist = generateChecklist({
    ticket: { id: 'T-2', machine_id: 'CNC-01', issue_text: 'spindle bearing noise' },
    machine: { id: 'CNC-01', name: 'CNC Lathe' },
    documents: [{ machine_id: 'CNC-01', title: 'Spindle Maintenance SOP', category: 'sop' }],
    history: [{ id: 'T-OLD', machine_id: 'CNC-01', status: 'resolved', issue_text: 'bearing noise in spindle', resolution: 'Replace bearing and verify vibration' }],
    parts: [{ machine_id: 'CNC-01', name: 'Spindle bearing', stock_qty: 2 }],
  });

  assert.ok(checklist.some((item) => item.source === 'Approved machine data'));
  assert.ok(checklist.some((item) => item.source === 'Machine repair history'));
  assert.ok(checklist.some((item) => item.source === 'Live spare inventory'));
});

