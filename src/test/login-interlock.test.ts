import { describe, it, expect } from 'vitest';
import { positionMatchesRole } from '@/lib/dynamo-auth';

describe('login position interlock', () => {
  it('accepts matching admin', () => expect(positionMatchesRole('admin', 'admin')).toBe(true));
  it('rejects admin position with viewer code', () => expect(positionMatchesRole('admin', 'viewer')).toBe(false));
  it('rejects viewer position with admin code', () => expect(positionMatchesRole('viewer', 'admin')).toBe(false));
  it('partner accepts qt_ vendor role', () => expect(positionMatchesRole('partner', 'qt_yamaichi')).toBe(true));
  it('partner rejects leader code', () => expect(positionMatchesRole('partner', 'leader')).toBe(false));
});
