import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  formatVendorName,
  canViewVendorName,
  canViewPricing,
  setPricingVisible,
  isPricingVisible,
  type Role,
} from '../lib/dynamo-auth';
import { money, number, date } from '../lib/dynamo-data';
import type { Locale } from '../i18n/types';

/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL STRESS TEST HARNESS (CHALLENGER 2)
 * Scope: Domain Invariants, Partner Confidentiality, Pricing Security, Wireframe UI
 * ============================================================================
 */

describe('CHALLENGER 2: Adversarial Audit & Empirical Verification Suite', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const localesDir = path.join(rootDir, 'src/i18n/locales');
  const namespaces = ['common', 'nav', 'tracking', 'dashboard', 'orders', 'sync', 'telemetry'];

  // ==========================================================================
  // TASK 1: ADVERSARIAL SECURITY & MASKING AUDIT
  // ==========================================================================
  describe('Task 1: Partner Confidentiality & Pricing Security Masking', () => {
    it('SEC-01: formatVendorName prevents contractor leaks to unprivileged roles (viewer, leader)', () => {
      const sensitiveVendors = ['YAMAICHI', 'PROVISION', 'SANKO', 'DAIDOH', 'NIPPON_STEEL'];
      const unprivilegedRoles: Role[] = ['viewer', 'leader'];

      for (const vendor of sensitiveVendors) {
        for (const role of unprivilegedRoles) {
          const result = formatVendorName(vendor, role);
          // CRITICAL SECURITY ASSERTION: Contractor name must NEVER leak
          expect(result, `Vendor ${vendor} must not leak to role ${role}`).not.toBe(vendor);
          expect(result, `Vendor ${vendor} must not be contained in masked string`).not.toContain(vendor);
        }
      }
    });

    it('SEC-02: formatVendorName enforces partner scoping (qt_<vendor>)', () => {
      // Yamaichi partner can see YAMAICHI but NOT PROVISION
      expect(formatVendorName('YAMAICHI', 'qt_yamaichi')).toBe('YAMAICHI');
      expect(formatVendorName('PROVISION', 'qt_yamaichi')).not.toBe('PROVISION');

      // Provision partner can see PROVISION but NOT YAMAICHI
      expect(formatVendorName('PROVISION', 'qt_provision')).toBe('PROVISION');
      expect(formatVendorName('YAMAICHI', 'qt_provision')).not.toBe('YAMAICHI');

      // Admin can see all vendors
      expect(formatVendorName('YAMAICHI', 'admin')).toBe('YAMAICHI');
      expect(formatVendorName('PROVISION', 'admin')).toBe('PROVISION');
    });

    it('SEC-03: formatVendorName edge cases (null, empty, undefined, dashes, invalid roles)', () => {
      expect(formatVendorName(null, 'viewer')).toBe('—');
      expect(formatVendorName(undefined, 'admin')).toBe('—');
      expect(formatVendorName('—', 'leader')).toBe('—');
      expect(formatVendorName('', 'viewer')).toBe('—');

      // Malformed / invalid roles should fail closed (never leak)
      const invalidRoles = ['guest', 'operator', 'anonymous', 'viewer_hack', ''];
      for (const r of invalidRoles) {
        const masked = formatVendorName('YAMAICHI', r as Role);
        expect(masked).not.toBe('YAMAICHI');
      }
    });

    it('SEC-DEFECT-01: [DEFECT CHECK] formatVendorName trilingual masking support (locale parameter)', () => {
      // Requirement R2 & PROJECT.md specify:
      // formatVendorName returns VI: 'Đã Ẩn', EN: 'Masked', JA: '非公開'
      const formatWithLocale = formatVendorName as (
        vendor: string | undefined | null,
        role: Role,
        locale?: Locale,
      ) => string;

      const viMask = formatWithLocale('YAMAICHI', 'viewer', 'vi');
      const enMask = formatWithLocale('YAMAICHI', 'viewer', 'en');
      const jaMask = formatWithLocale('YAMAICHI', 'viewer', 'ja');

      // In VI, it returns 'Đã Ẩn'
      expect(viMask).toBe('Đã Ẩn');

      // CHALLENGE: Does formatVendorName actually support EN ('Masked') and JA ('非公開')?
      // In src/lib/dynamo-auth.ts, formatVendorName ignores locale and hardcodes 'Đã Ẩn'.
      // If it returns 'Đã Ẩn' for EN and JA, this test records the defect!
      const supportsEn = enMask === 'Masked';
      const supportsJa = jaMask === '非公開';

      // We assert whether multilingual masking is properly implemented:
      expect(
        { supportsEn, supportsJa, enMask, jaMask },
        `formatVendorName does not support trilingual masking: en returned '${enMask}', ja returned '${jaMask}'`,
      ).toEqual({
        supportsEn: true,
        supportsJa: true,
        enMask: 'Masked',
        jaMask: '非公開',
      });
    });

    it('SEC-04: canViewPricing permissions logic', () => {
      expect(canViewPricing('admin')).toBe(true);
      expect(canViewPricing('leader')).toBe(true);
      expect(canViewPricing('viewer')).toBe(false);
      expect(canViewPricing('qt_yamaichi')).toBe(false);
      expect(canViewPricing('qt_provision')).toBe(false);
      expect(canViewPricing('' as Role)).toBe(false);
      expect(canViewPricing('unknown' as Role)).toBe(false);
    });

    it('SEC-05: Pricing masking via money() function', () => {
      // When pricing is visible
      setPricingVisible(true);
      expect(isPricingVisible()).toBe(true);
      const visible = money(1500000);
      expect(visible).toContain('1.500.000');
      expect(visible).toContain('₫');

      // When pricing is masked
      setPricingVisible(false);
      expect(isPricingVisible()).toBe(false);
      const masked = money(1500000);
      expect(masked).toBe('*** ₫');
      expect(money(0)).toBe('*** ₫');
      expect(money(-50000)).toBe('*** ₫');

      // Restore
      setPricingVisible(true);
    });

    it('SEC-06: Static code audit of CSV exports and printouts for pricing leaks', () => {
      const ordersSrc = fs.readFileSync(path.join(rootDir, 'src/routes/orders.tsx'), 'utf-8');
      const trackingSrc = fs.readFileSync(path.join(rootDir, 'src/routes/tracking.tsx'), 'utf-8');
      const jobTicketSrc = fs.readFileSync(path.join(rootDir, 'src/components/job-ticket.tsx'), 'utf-8');

      // 1. orders.tsx: exportCsv must conditionally exclude don_gia and thanh_tien based on canViewPricing
      expect(ordersSrc).toContain('canViewPricing(role)');
      expect(ordersSrc).toContain("isPricingAllowed ? (['don_gia', 'thanh_tien']");

      // 2. orders.tsx: Table rendering must gate don_gia and thanh_tien
      expect(ordersSrc).toContain('{isPricingAllowed && (');

      // 3. tracking.tsx: exportCsv must never contain don_gia or thanh_tien in exported columns
      const trackingExportMatch = trackingSrc.match(/const exportCsv =[\s\S]*?const head = \[([\s\S]*?)\];/);
      expect(trackingExportMatch).not.toBeNull();
      const exportCols = trackingExportMatch![1];
      expect(exportCols).not.toContain('don_gia');
      expect(exportCols).not.toContain('Đơn giá');
      expect(exportCols).not.toContain('thanh_tien');
      expect(exportCols).not.toContain('Thành tiền');

      // 4. job-ticket.tsx: SingleA4TicketContent must gate pricing by canViewPricing(role)
      expect(jobTicketSrc).toContain('const pricing = canViewPricing(role);');
      expect(jobTicketSrc).toContain('{pricing && (');
    });
  });

  // ==========================================================================
  // TASK 2: ADVERSARIAL DOMAIN INVARIANTS STRESS TEST
  // ==========================================================================
  describe('Task 2: Adversarial Domain Invariants Stress Test', () => {
    it('INV-01: Status codes (WAIT, TRANSIT, STOCKED, PASS, FAIL, PENDING) remain exact uppercase invariants across all 21 JSON files', () => {
      const requiredStatuses = ['WAIT', 'TRANSIT', 'STOCKED', 'PASS', 'FAIL', 'PENDING'];
      const locales: Locale[] = ['vi', 'en', 'ja'];

      for (const loc of locales) {
        const trackingJson = JSON.parse(
          fs.readFileSync(path.join(localesDir, loc, 'tracking.json'), 'utf-8'),
        );
        expect(trackingJson.status.wait).toBe('WAIT');
        expect(trackingJson.status.transit).toBe('TRANSIT');
        expect(trackingJson.status.stocked).toBe('STOCKED');
        expect(trackingJson.status.pass).toBe('PASS');
        expect(trackingJson.status.fail).toBe('FAIL');
        expect(trackingJson.status.pending).toBe('PENDING');
      }
    });

    it('INV-DEFECT-01: [DEFECT CHECK] Metallurgy engineering standards (QT invariant preservation in Japanese)', () => {
      const locales: Locale[] = ['vi', 'en', 'ja'];
      for (const loc of locales) {
        const commonJson = JSON.parse(fs.readFileSync(path.join(localesDir, loc, 'common.json'), 'utf-8'));
        const dashboardJson = JSON.parse(fs.readFileSync(path.join(localesDir, loc, 'dashboard.json'), 'utf-8'));
        const rawCommon = JSON.stringify(commonJson);
        const rawDashboard = JSON.stringify(dashboardJson);

        // HRC must always be capitalized
        expect(rawCommon).toContain('HRC');
        expect(rawCommon).not.toMatch(/\bhrc\b/); // No lowercase hrc

        // QT must always be capitalized in both common and dashboard handover report
        expect(rawCommon, `Locale ${loc} common.json must contain invariant QT`).toContain('QT');
        expect(rawDashboard, `Locale ${loc} dashboard.json must contain invariant QT (e.g. in handover docHeader)`).toContain('QT');
      }
    });

    it('INV-03: Workshop identifiers (PIN, INSERT, MOLD) remain uppercase in all locales', () => {
      const locales: Locale[] = ['vi', 'en', 'ja'];
      for (const loc of locales) {
        const trackingJson = JSON.parse(fs.readFileSync(path.join(localesDir, loc, 'tracking.json'), 'utf-8'));
        const commonJson = JSON.parse(fs.readFileSync(path.join(localesDir, loc, 'common.json'), 'utf-8'));

        expect(trackingJson.workshops.pin).toContain('PIN');
        expect(trackingJson.workshops.insert).toContain('INSERT');
        expect(trackingJson.workshops.mold).toContain('MOLD');

        const rawCommon = JSON.stringify(commonJson);
        expect(rawCommon).toContain('PIN');
        expect(rawCommon).toContain('INSERT');
        expect(rawCommon).toContain('MOLD');
      }
    });
  });

  // ==========================================================================
  // TASK 3: WIREFRAME UI CONSTRAINT STRESS TEST
  // ==========================================================================
  describe('Task 3: Wireframe UI Layout & Token Compliance Stress Test', () => {
    it('UI-01: Zero illegal rounded classes (rounded-lg, rounded-2xl, rounded-3xl) in core routes and views', () => {
      const targetFiles = [
        'src/routes/tracking.tsx',
        'src/routes/dashboard.tsx',
        'src/routes/orders.tsx',
        'src/routes/sync.tsx',
        'src/components/dynamo-shell.tsx',
        'src/components/shopfloor-telemetry.tsx',
        'src/components/command-palette.tsx',
        'src/components/lot-update-dialog.tsx',
        'src/components/webhook-config.tsx',
      ];

      for (const file of targetFiles) {
        const content = fs.readFileSync(path.join(rootDir, file), 'utf-8');
        expect(content, `${file} must not contain rounded-lg`).not.toContain('rounded-lg');
        expect(content, `${file} must not contain rounded-xl`).not.toContain('rounded-xl');
        expect(content, `${file} must not contain rounded-2xl`).not.toContain('rounded-2xl');
        expect(content, `${file} must not contain rounded-3xl`).not.toContain('rounded-3xl');
      }
    });

    it('UI-02: rounded-full is restricted strictly to micro LED status dots (size-1.5, size-2)', () => {
      const targetFiles = [
        'src/routes/tracking.tsx',
        'src/routes/dashboard.tsx',
        'src/routes/orders.tsx',
        'src/routes/sync.tsx',
        'src/components/dynamo-shell.tsx',
        'src/components/shopfloor-telemetry.tsx',
        'src/components/webhook-config.tsx',
      ];

      for (const file of targetFiles) {
        const content = fs.readFileSync(path.join(rootDir, file), 'utf-8');
        const matches = content.match(/className="[^"]*rounded-full[^"]*"/g) || [];
        for (const m of matches) {
          const isMicroDot = m.includes('size-1.5') || m.includes('size-2') || m.includes('w-[1.5px]');
          expect(
            isMicroDot,
            `In ${file}: rounded-full found outside micro LED dot: ${m}`,
          ).toBe(true);
        }
      }
    });

    it('UI-DEFECT-01: [DEFECT CHECK] Check login.tsx for consumer rounded-full step indicator circles', () => {
      const loginSrc = fs.readFileSync(path.join(rootDir, 'src/routes/login.tsx'), 'utf-8');
      // Look for rounded-full in login.tsx
      const matches = loginSrc.match(/className={`[^`]*rounded-full[^`]*`}|className="[^"]*rounded-full[^"]*"/g) || [];
      const nonMicroDots = matches.filter(
        (m) => !m.includes('size-1.5') && !m.includes('size-2'),
      );
      // In login.tsx, line 394 has: className={`flex size-6 shrink-0 items-center justify-center rounded-full ...`}
      // This violates the strict "rounded-full is restricted only to micro LED status dots" rule
      expect(
        nonMicroDots.length,
        `login.tsx contains illegal rounded-full classes: ${JSON.stringify(nonMicroDots)}`,
      ).toBe(0);
    });

    it('UI-03: Monospaced and tabular numbers enforcement on data grids and quantitative numbers', () => {
      const trackingSrc = fs.readFileSync(path.join(rootDir, 'src/routes/tracking.tsx'), 'utf-8');
      const ordersSrc = fs.readFileSync(path.join(rootDir, 'src/routes/orders.tsx'), 'utf-8');
      const dashboardSrc = fs.readFileSync(path.join(rootDir, 'src/routes/dashboard.tsx'), 'utf-8');

      expect(trackingSrc).toContain('font-mono tabular-nums');
      expect(ordersSrc).toContain('font-mono tabular-nums');
      expect(dashboardSrc).toContain('font-mono tabular-nums');
    });
  });
});
