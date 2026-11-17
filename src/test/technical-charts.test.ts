import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  parseHeatCycleShorthand,
  formatHeatCycleShorthand,
  type HeatStepParam,
} from '@/components/technical-charts/heat-treatment-cycle/heat-cycle-types';

describe('Technical Charts - Heat Treatment Cycle Suite (TDD)', () => {
  describe('TC-HEAT-01: Shorthand String Parser & Serializer', () => {
    it('parses standard shorthand string with Q, T1, T2 and optional T3', () => {
      const input = 'Q: 1020°C / 2H | T1: 615°C / 4.4H | T2: 540°C / 5H';
      const steps = parseHeatCycleShorthand(input);

      expect(steps.length).toBe(4);
      expect(steps[0]).toEqual({ stage: 'Q', temp: 1020, time: 2 });
      expect(steps[1]).toEqual({ stage: 'T1', temp: 615, time: 4.4 });
      expect(steps[2]).toEqual({ stage: 'T2', temp: 540, time: 5 });
      expect(steps[3]).toEqual({ stage: 'T3', temp: undefined, time: undefined });
    });

    it('parses compact format without units (e.g. 1020/2 | 540/5 | 593/5)', () => {
      const compact = '1020/2 | 540/5 | 593/5';
      const steps = parseHeatCycleShorthand(compact);

      expect(steps[0]!.temp).toBe(1020);
      expect(steps[0]!.time).toBe(2);
      expect(steps[1]!.temp).toBe(540);
      expect(steps[1]!.time).toBe(5);
      expect(steps[2]!.temp).toBe(593);
      expect(steps[2]!.time).toBe(5);
    });

    it('serializes step parameters back to standard human-readable shorthand', () => {
      const sampleSteps: HeatStepParam[] = [
        { stage: 'Q', temp: 1020, time: 2 },
        { stage: 'T1', temp: 615, time: 4.4 },
        { stage: 'T2', temp: 540, time: 5 },
      ];
      const serialized = formatHeatCycleShorthand(sampleSteps);
      expect(serialized).toBe('Q: 1020°C / 2H | T1: 615°C / 4.4H | T2: 540°C / 5H');
    });

    it('handles empty or malformed strings gracefully returning default 4 empty stages', () => {
      const emptyResult = parseHeatCycleShorthand('');
      expect(emptyResult.length).toBe(4);
      expect(emptyResult[0]!.stage).toBe('Q');
      expect(emptyResult[0]!.temp).toBeUndefined();
    });
  });

  describe('TC-HEAT-02: Component Rendering & Architectural Specification', () => {
    const componentPath = path.resolve(
      __dirname,
      '../components/technical-charts/heat-treatment-cycle/heat-treatment-cycle.tsx'
    );

    it('ensures HeatTreatmentCycle component adheres to 1px industrial wireframe and font-mono specs', () => {
      const src = fs.readFileSync(componentPath, 'utf-8');
      expect(src).toContain('strokeWidth="1.2"');
      expect(src).toContain('fontFamily="monospace"');
      expect(src).toContain('tabular-nums');
      expect(src).toContain('heat-arrowhead');
    });
  });

  describe('TC-HEAT-03: Job Ticket Integration (Section II Heat Treatment Cycle)', () => {
    const jobTicketPath = path.resolve(__dirname, '../components/job-ticket.tsx');

    it('verifies job-ticket.tsx embeds HeatTreatmentCycle in Section II with uppercase title', () => {
      const src = fs.readFileSync(jobTicketPath, 'utf-8');
      expect(src).toContain('HeatTreatmentCycle');
      expect(src).toContain('item.ncc_giando');
      expect(src).toContain('II. BIỂU ĐỒ CHU TRÌNH NHIỆT LUYỆN');
    });
  });

  describe('TC-HEAT-04: HeatCycleModal Component Exists & Has Industrial Presets', () => {
    const modalPath = path.resolve(
      __dirname,
      '../components/technical-charts/heat-treatment-cycle/heat-cycle-modal.tsx'
    );

    it('verifies heat-cycle-modal.tsx exists and defines metallurgical presets', () => {
      expect(fs.existsSync(modalPath)).toBe(true);
      const src = fs.readFileSync(modalPath, 'utf-8');
      expect(src).toContain('HEAT_CYCLE_PRESETS');
      expect(src).toContain('HeatTreatmentCycle');
      expect(src).toContain('formatHeatCycleShorthand');
    });

    it('verifies heat-cycle-modal.tsx supports uninitialized notice and expanded max-w-[960px] layout', () => {
      const src = fs.readFileSync(modalPath, 'utf-8');
      expect(src).toContain('max-w-[960px]');
      expect(src).toContain('Chưa có thông số chu trình nhiệt luyện');
    });
  });

  describe('TC-HEAT-05: Mini Vector SVG Heat Cycle Button in AttachmentCell', () => {
    const attachmentFieldPath = path.resolve(
      __dirname,
      '../components/tracking/attachment-field.tsx'
    );

    it('verifies attachment-field.tsx renders mini SVG vector instead of emoji text', () => {
      const src = fs.readFileSync(attachmentFieldPath, 'utf-8');
      expect(src).not.toContain('🔥 CHU TRÌNH');
      expect(src).toContain('HeatTreatmentCycle');
      expect(src).toContain('variant="mini"');
    });

    it('verifies attachment-field.tsx uses Radix HoverCard Portal and Pure White Wireframe without QT badge', () => {
      const src = fs.readFileSync(attachmentFieldPath, 'utf-8');
      // Radix HoverCard Portal integration
      expect(src).toContain('HoverCard');
      expect(src).toContain('HoverCardTrigger');
      expect(src).toContain('HoverCardContent');

      // Pure White styling
      expect(src).toContain('bg-white hover:bg-slate-100 text-slate-800 border border-slate-300');

      // Explicitly removed QT text/tag from button
      expect(src).not.toContain('>QT<');
      expect(src).not.toContain('> QT<');
    });
  });
});
