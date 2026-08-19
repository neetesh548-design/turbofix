import { describe, it, expect } from 'vitest';
import {
  parseCSV,
  parseMachinesCSV,
  buildMachineImportTemplateCSV,
  MACHINE_IMPORT_COLUMNS,
} from '../utils/machineImport';

describe('parseCSV', () => {
  it('splits simple comma-separated rows', () => {
    expect(parseCSV('a,b,c\n1,2,3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('handles quoted fields containing commas', () => {
    expect(parseCSV('"Shop 2, Bay 4",CNC')).toEqual([['Shop 2, Bay 4', 'CNC']]);
  });

  it('handles escaped quotes inside quoted fields', () => {
    expect(parseCSV('"He said ""hi""",ok')).toEqual([['He said "hi"', 'ok']]);
  });

  it('strips a leading BOM', () => {
    expect(parseCSV('﻿name,location\nA,B')).toEqual([['name', 'location'], ['A', 'B']]);
  });

  it('drops fully blank rows', () => {
    expect(parseCSV('a,b\n\n1,2\n')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('buildMachineImportTemplateCSV', () => {
  it('has one header row per MACHINE_IMPORT_COLUMNS entry, plus a filled example row', () => {
    const rows = parseCSV(buildMachineImportTemplateCSV());
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveLength(MACHINE_IMPORT_COLUMNS.length);
    expect(rows[1].every((cell) => cell !== '')).toBe(true);
  });
});

describe('parseMachinesCSV', () => {
  it('reports an empty file', () => {
    expect(parseMachinesCSV('').errors[0].message).toMatch(/empty/i);
  });

  it('reports a missing name column', () => {
    const result = parseMachinesCSV('Location,Category\nBay 2,Machining');
    expect(result.valid).toEqual([]);
    expect(result.errors[0].message).toMatch(/Machine name/);
  });

  it('parses a valid row with every column filled', () => {
    const csv = [
      'Machine name,Location,Asset tag / code,Category,Manufacturer,Model,Serial number,Department,Production line,Criticality (low/medium/high/critical),Downtime cost per hour (₹),Maintenance interval (days)',
      'CNC Lathe 2,Shop 1,CNC-02,Machining,HMT,NH-22,SN-88213,Production,Line A,high,1500,90',
    ].join('\n');
    const result = parseMachinesCSV(csv);
    expect(result.errors).toEqual([]);
    expect(result.valid).toEqual([{
      name: 'CNC Lathe 2',
      location: 'Shop 1',
      asset_code: 'CNC-02',
      category: 'Machining',
      manufacturer: 'HMT',
      model: 'NH-22',
      serial_number: 'SN-88213',
      department: 'Production',
      production_line: 'Line A',
      criticality: 'high',
      hourly_downtime_cost: 1500,
      maintenance_interval_days: 90,
    }]);
  });

  it('accepts common header aliases, not just the exact template labels', () => {
    const csv = 'Name,Serial\nDrill Press,SN-1';
    const result = parseMachinesCSV(csv);
    expect(result.errors).toEqual([]);
    expect(result.valid[0].name).toBe('Drill Press');
    expect(result.valid[0].serial_number).toBe('SN-1');
  });

  it('defaults missing optional fields to the same values the Add Machine form uses', () => {
    const result = parseMachinesCSV('Name\nBare Minimum Machine');
    expect(result.valid[0].criticality).toBe('medium');
    expect(result.valid[0].hourly_downtime_cost).toBe(0);
    expect(result.valid[0].maintenance_interval_days).toBe(90);
  });

  it('flags a row with no name and continues validating the rest', () => {
    const csv = 'Name,Location\n,Bay 1\nReal Machine,Bay 2';
    const result = parseMachinesCSV(csv);
    expect(result.errors).toEqual([{ rowNumber: 1, message: 'Machine name is required.' }]);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].name).toBe('Real Machine');
  });

  it('flags a non-numeric downtime cost', () => {
    const csv = 'Name,Downtime cost per hour (₹)\nBad Row,not-a-number';
    const result = parseMachinesCSV(csv);
    expect(result.valid).toEqual([]);
    expect(result.errors[0].message).toMatch(/downtime cost per hour must be a number/);
  });

  it('normalizes an invalid criticality value to medium rather than rejecting the row', () => {
    const csv = 'Name,Criticality (low/medium/high/critical)\nSome Machine,urgent';
    const result = parseMachinesCSV(csv);
    expect(result.errors).toEqual([]);
    expect(result.valid[0].criticality).toBe('medium');
  });
});
