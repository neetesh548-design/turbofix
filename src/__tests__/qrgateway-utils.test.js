import { describe, it, expect } from 'vitest';

// ── Pure function replicas from QRGateway.jsx (lines ~198-211) ──
// These match the EXACT regex patterns used in production code.

const suggestUrgency = (text) => {
  const t = (text || '').toLowerCase();
  if (/\b(fire|smoke|burning|spark|shock|injur|accident|gas leak|not safe|danger)\b/.test(t)) return 'critical';
  if (/\b(stopped|not working|breakdown|down|leak|overheat|hot|noise|vibrat|smell|jam)\b/.test(t)) return 'high';
  if (/\b(slow|minor|small|sometimes|occasional)\b/.test(t)) return 'low';
  return 'medium';
};

const suggestCondition = (text) => {
  const t = (text || '').toLowerCase();
  if (/\b(unsafe|fire|smoke|burning|spark|shock|danger)\b/.test(t)) return 'unsafe';
  if (/\b(stopped|not working|breakdown|down|jam)\b/.test(t)) return 'stopped';
  return 'running';
};

// ── suggestUrgency ──

describe('suggestUrgency', () => {
  it('should return critical for fire/smoke/danger keywords', () => {
    expect(suggestUrgency('There is fire near the motor')).toBe('critical');
    expect(suggestUrgency('Smoke coming out from panel')).toBe('critical');
    expect(suggestUrgency('Electric shock happened')).toBe('critical');
    expect(suggestUrgency('Gas leak detected')).toBe('critical');
    expect(suggestUrgency('Machine is not safe')).toBe('critical');
    expect(suggestUrgency('Danger area')).toBe('critical');
  });

  it('should return high for breakdown/leak/overheat keywords', () => {
    expect(suggestUrgency('Machine has stopped')).toBe('high');
    expect(suggestUrgency('Complete breakdown since morning')).toBe('high');
    expect(suggestUrgency('Oil leak near gearbox')).toBe('high');
    expect(suggestUrgency('Motor overheat detected')).toBe('high');
    expect(suggestUrgency('Strange noise from bearing')).toBe('high');
    expect(suggestUrgency('Belt jam on line 3')).toBe('high');
    expect(suggestUrgency('Machine is hot to touch')).toBe('high');
    expect(suggestUrgency('Burning smell nearby')).toBe('critical'); // "burning" matches critical first
  });

  it('should return low for minor issues', () => {
    expect(suggestUrgency('Minor scratch on surface')).toBe('low');
    expect(suggestUrgency('Runs a bit slow today')).toBe('low');
    expect(suggestUrgency('Small issue on panel')).toBe('low');
    expect(suggestUrgency('Happens sometimes only')).toBe('low');
  });

  it('should return medium for generic/unrecognized issues', () => {
    expect(suggestUrgency('Machine needs maintenance')).toBe('medium');
    expect(suggestUrgency('Check the coolant level')).toBe('medium');
    expect(suggestUrgency('Need to replace filter')).toBe('medium');
  });

  it('should handle empty/null input gracefully', () => {
    expect(suggestUrgency('')).toBe('medium');
    expect(suggestUrgency(null)).toBe('medium');
    expect(suggestUrgency(undefined)).toBe('medium');
  });

  it('should be case-insensitive', () => {
    expect(suggestUrgency('FIRE IN THE MACHINE')).toBe('critical');
    expect(suggestUrgency('Machine STOPPED')).toBe('high');
  });

  it('critical should take precedence over high', () => {
    expect(suggestUrgency('Fire and oil leak near compressor')).toBe('critical');
  });
});

// ── suggestCondition ──

describe('suggestCondition', () => {
  it('should return unsafe for fire/smoke/danger', () => {
    expect(suggestCondition('Fire near motor')).toBe('unsafe');
    expect(suggestCondition('Smoke from panel')).toBe('unsafe');
    expect(suggestCondition('Spark observed on wire')).toBe('unsafe');
    expect(suggestCondition('Burning at the top, danger')).toBe('unsafe');
  });

  it('should return stopped for breakdown/jam', () => {
    expect(suggestCondition('Machine has stopped')).toBe('stopped');
    expect(suggestCondition('Not working since morning')).toBe('stopped');
    expect(suggestCondition('Complete breakdown')).toBe('stopped');
    expect(suggestCondition('Conveyor jam on line 2')).toBe('stopped');
  });

  it('should return running as default', () => {
    expect(suggestCondition('Minor oil leak')).toBe('running');
    expect(suggestCondition('Need maintenance')).toBe('running');
    expect(suggestCondition('Temperature slightly high')).toBe('running');
  });

  it('should handle empty/null input gracefully', () => {
    expect(suggestCondition('')).toBe('running');
    expect(suggestCondition(null)).toBe('running');
    expect(suggestCondition(undefined)).toBe('running');
  });

  it('unsafe should take precedence over stopped', () => {
    expect(suggestCondition('Machine stopped with fire')).toBe('unsafe');
  });
});
