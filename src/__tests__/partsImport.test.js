import { describe, it, expect } from 'vitest';
import {
  parsePartsCSV,
  buildPartImportTemplateCSV,
  PART_IMPORT_COLUMNS,
  parseCSV,
} from '../utils/partsImport';

describe('buildPartImportTemplateCSV', () => {
  it('has one header row per PART_IMPORT_COLUMNS entry, plus a filled example row', () => {
    const rows = parseCSV(buildPartImportTemplateCSV());
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveLength(PART_IMPORT_COLUMNS.length);
    expect(rows[1].every((cell) => cell !== '')).toBe(true);
  });

  it("round-trips through its own parser without errors (catches header/alias drift)", () => {
    const rows = parseCSV(buildPartImportTemplateCSV());
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const result = parsePartsCSV(csv);
    expect(result.errors).toEqual([]);
    expect(result.valid).toHaveLength(1);
  });
});

describe('parsePartsCSV', () => {
  it('reports an empty file', () => {
    expect(parsePartsCSV('').errors[0].message).toMatch(/empty/i);
  });

  it('reports a missing name column', () => {
    const result = parsePartsCSV('Supplier,Location\nHydrotech,Bin A');
    expect(result.valid).toEqual([]);
    expect(result.errors[0].message).toMatch(/Part name/);
  });

  it('parses a fully-filled valid row', () => {
    const csv = [
      'Part name,Part number,Associated machine,Machine priority (Low/Medium/High/Critical),Stock on hand,Reorder level,Unit cost (₹),Lead time (days),Supplier,Bin / location',
      'Bearing 6205ZZ,BRG-6205ZZ,CNC Lathe 1,High,12,5,450,7,Hydrotech Services,Bin A-04',
    ].join('\n');
    const result = parsePartsCSV(csv);
    expect(result.errors).toEqual([]);
    expect(result.valid).toEqual([{
      name: 'Bearing 6205ZZ',
      part_number: 'BRG-6205ZZ',
      associated_machine: 'CNC Lathe 1',
      machine_priority: 'High',
      stock_qty: 12,
      reorder_level: 5,
      unit_cost: 450,
      lead_time_days: 7,
      supplier: 'Hydrotech Services',
      location: 'Bin A-04',
    }]);
  });

  it('accepts common header aliases', () => {
    const result = parsePartsCSV('Name,Qty,Vendor\nBelt,10,ACME');
    expect(result.errors).toEqual([]);
    expect(result.valid[0].stock_qty).toBe(10);
    expect(result.valid[0].supplier).toBe('ACME');
  });

  it('defaults missing optional fields the same way the Add Part form does', () => {
    const result = parsePartsCSV('Part name\nBare Minimum Part');
    expect(result.valid[0].machine_priority).toBe('Medium');
    expect(result.valid[0].stock_qty).toBe(0);
    expect(result.valid[0].reorder_level).toBe(0);
  });

  it('normalizes an invalid priority to Medium rather than rejecting the row', () => {
    const result = parsePartsCSV('Part name,Machine priority (Low/Medium/High/Critical)\nSome Part,urgent');
    expect(result.errors).toEqual([]);
    expect(result.valid[0].machine_priority).toBe('Medium');
  });

  it('flags a non-numeric stock quantity', () => {
    const result = parsePartsCSV('Part name,Stock on hand\nBad Row,many');
    expect(result.valid).toEqual([]);
    expect(result.errors[0].message).toMatch(/Stock on hand must be a number/);
  });

  it('flags a missing name and continues validating remaining rows', () => {
    const csv = 'Part name,Supplier\n,ACME\nReal Part,ACME';
    const result = parsePartsCSV(csv);
    expect(result.errors).toEqual([{ rowNumber: 1, message: 'Part name is required.' }]);
    expect(result.valid).toHaveLength(1);
  });
});
