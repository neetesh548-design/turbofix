import { describe, expect, it } from 'vitest';
import { filterRowsForUserCompany, isRealFactoryUser } from '../utils/tenant';

describe('tenant filtering', () => {
  const realUser = { company_code: 'NKS', inventory_mode: 'live' };

  it('keeps only the signed-in real factory company rows', () => {
    const rows = [
      { id: 'nks-1', company_code: 'NKS' },
      { id: 'acme-1', company_code: 'ACME3' },
      { id: 'missing-code' },
      { id: 'bb100000-demo', company_code: 'NKS' },
    ];

    expect(filterRowsForUserCompany(rows, realUser)).toEqual([{ id: 'nks-1', company_code: 'NKS' }]);
  });

  it('does not filter demo sessions', () => {
    const rows = [{ id: 'demo-1', company_code: 'TFDEMO' }];
    expect(filterRowsForUserCompany(rows, { company_code: 'TFDEMO' })).toEqual(rows);
    expect(filterRowsForUserCompany(rows, { company_code: 'NKS', inventory_mode: 'demo' })).toEqual(rows);
  });

  it('recognizes real factory users explicitly', () => {
    expect(isRealFactoryUser(realUser)).toBe(true);
    expect(isRealFactoryUser({ company_code: 'TFDEMO' })).toBe(false);
    expect(isRealFactoryUser({ company_code: 'NKS', inventory_mode: 'demo' })).toBe(false);
  });
});
