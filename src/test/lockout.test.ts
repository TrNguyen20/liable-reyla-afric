import { describe, it, expect } from 'vitest';
import { recordFail, lockRemainingMs, isLocked, LOCK_MS } from '@/lib/data-scope';

describe('khóa thiết bị sau 5 lần sai', () => {
  it('khóa đúng 2 phút', () => {
    expect(LOCK_MS).toBe(120000);
    const t = 1_000_000;
    expect(recordFail('lk', t)).toBe(4);
    for (let i = 0; i < 3; i++) recordFail('lk', t);
    expect(recordFail('lk', t)).toBe(0);
    expect(lockRemainingMs('lk', t)).toBe(120000);
    expect(isLocked('lk', t + 119999)).toBe(true);
    expect(isLocked('lk', t + 120000)).toBe(false);
  });
});
