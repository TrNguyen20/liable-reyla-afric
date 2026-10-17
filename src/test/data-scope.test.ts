import { describe, it, expect } from 'vitest';
import { scopeItemsForRole, isLocked, recordFail, MAX_FAILS } from '@/lib/data-scope';
import type { QTItem } from '@/lib/dynamo-data';
const items = [
  { ID_Key: 'a', cty_QT: 'YAMAICHI', don_gia: 100, thanh_tien: 500 },
  { ID_Key: 'b', cty_QT: 'PROVISION', don_gia: 200, thanh_tien: 900 },
] as unknown as QTItem[];
describe('server data scope', () => {
  it('viewer gets no prices or partner names', () => {
    const r = scopeItemsForRole(items, 'viewer');
    expect(r.every(i => i.don_gia === 0 && i.thanh_tien === 0)).toBe(true);
    expect(r.some(i => i.cty_QT === 'YAMAICHI' || i.cty_QT === 'PROVISION')).toBe(false);
  });
  it('no session is treated as viewer', () => {
    expect(scopeItemsForRole(items, null)[0]!.don_gia).toBe(0);
  });
  it('partner only sees own lots', () => {
    expect(scopeItemsForRole(items, 'qt_provision').map(i => i.ID_Key)).toEqual(['b']);
  });
  it('admin sees everything', () => {
    expect(scopeItemsForRole(items, 'admin')[1]!.thanh_tien).toBe(900);
  });
  it('locks after 5 wrong codes', () => {
    for (let i = 0; i < MAX_FAILS - 1; i++) recordFail('ip1');
    expect(isLocked('ip1')).toBe(false);
    recordFail('ip1');
    expect(isLocked('ip1')).toBe(true);
  });
});
