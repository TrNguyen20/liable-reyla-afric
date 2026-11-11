import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  parseAttachments,
  serializeAttachments,
  inferFileType,
  middleTruncate,
  detectCloudSource,
  parseMultiUrls,
  smartMatchFileToLot,
  type AttachmentItem,
  type CloudSource,
} from '@/components/tracking/attachment-field';

describe('Attachment Field & Date Cell Suite (TDD)', () => {
  describe('TC-ATT-01: Smart Parsing of Attachment Data Formats', () => {
    it('handles empty, undefined, or null input gracefully', () => {
      expect(parseAttachments('')).toEqual([]);
      expect(parseAttachments(undefined)).toEqual([]);
      expect(parseAttachments(null as any)).toEqual([]);
      expect(parseAttachments('   ')).toEqual([]);
    });

    it('parses single plain URL string (backward compatibility)', () => {
      const url = 'https://drive.google.com/file/d/12345/view';
      const items = parseAttachments(url);
      expect(items.length).toBe(1);
      expect(items[0]!.url).toBe(url);
      expect(items[0]!.type).toBe('link');
    });

    it('infers PDF type from URL extension', () => {
      const url = 'https://dynamo.vn/storage/certificates/qc_report_9615.pdf';
      const items = parseAttachments(url);
      expect(items.length).toBe(1);
      expect(items[0]!.type).toBe('pdf');
      expect(items[0]!.name).toContain('qc_report_9615.pdf');
    });

    it('infers image type from URL extension or data URI', () => {
      const urlJpg = 'https://dynamo.vn/thermal-charts/chart_Q2606.jpg';
      expect(parseAttachments(urlJpg)[0]!.type).toBe('image');

      const dataUriPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const itemsPng = parseAttachments(dataUriPng);
      expect(itemsPng[0]!.type).toBe('image');
    });

    it('infers excel spreadsheet type from URL extension', () => {
      const urlXlsx = 'https://dynamo.vn/reports/hardness_data.xlsx';
      expect(parseAttachments(urlXlsx)[0]!.type).toBe('excel');
    });

    it('parses newline or comma separated URLs into multiple AttachmentItems', () => {
      const multi = 'https://dynamo.vn/file1.pdf\nhttps://dynamo.vn/file2.png';
      const items = parseAttachments(multi);
      expect(items.length).toBe(2);
      expect(items[0]!.type).toBe('pdf');
      expect(items[1]!.type).toBe('image');
    });

    it('parses standardized JSON array string', () => {
      const jsonArr: AttachmentItem[] = [
        { id: '1', name: 'Chung_nhan.pdf', url: 'https://dynamo.vn/doc.pdf', type: 'pdf', size: '124 KB' },
        { id: '2', name: 'Gian_do.png', url: 'https://dynamo.vn/chart.png', type: 'image', size: '45 KB' },
      ];
      const items = parseAttachments(JSON.stringify(jsonArr));
      expect(items.length).toBe(2);
      expect(items[0]!.name).toBe('Chung_nhan.pdf');
      expect(items[1]!.name).toBe('Gian_do.png');
    });
  });

  describe('TC-ATT-02: Smart Serialization to Google Sheets Storage', () => {
    it('serializes empty array to empty string', () => {
      expect(serializeAttachments([])).toBe('');
    });

    it('serializes single item to plain URL string for 100% Sheet formula compatibility', () => {
      const items: AttachmentItem[] = [
        { id: '1', name: 'report.pdf', url: 'https://drive.google.com/doc1', type: 'pdf' },
      ];
      expect(serializeAttachments(items)).toBe('https://drive.google.com/doc1');
    });

    it('serializes multiple items to JSON string with full metadata', () => {
      const items: AttachmentItem[] = [
        { id: '1', name: 'report.pdf', url: 'https://dynamo.vn/doc1.pdf', type: 'pdf', size: '120 KB' },
        { id: '2', name: 'chart.png', url: 'https://dynamo.vn/chart.png', type: 'image', size: '80 KB' },
      ];
      const serialized = serializeAttachments(items);
      expect(serialized.startsWith('[')).toBe(true);
      expect(serialized.endsWith(']')).toBe(true);

      const parsedBack = JSON.parse(serialized);
      expect(parsedBack.length).toBe(2);
      expect(parsedBack[0].name).toBe('report.pdf');
    });
  });

  describe('TC-ATT-03: Middle Truncation Formatting', () => {
    it('does not truncate short file names', () => {
      expect(middleTruncate('test.pdf', 20)).toBe('test.pdf');
    });

    it('truncates long file names in the middle while preserving the extension', () => {
      const longName = 'bien_ban_nghiem_thu_nhiet_luyen_lo_Q260616A988_final.pdf';
      const truncated = middleTruncate(longName, 24);
      expect(truncated.endsWith('.pdf')).toBe(true);
      expect(truncated).toContain('…');
      expect(truncated.length).toBeLessThanOrEqual(25);
    });
  });

  describe('TC-ATT-04: Design System & Architectural Invariants', () => {
    const attachmentFieldSrc = fs.readFileSync(
      path.resolve(__dirname, '../components/tracking/attachment-field.tsx'),
      'utf-8'
    );
    const dateCellSrc = fs.readFileSync(
      path.resolve(__dirname, '../components/tracking/date-cell.tsx'),
      'utf-8'
    );
    const trackingTsxSrc = fs.readFileSync(
      path.resolve(__dirname, '../routes/tracking.tsx'),
      'utf-8'
    );

    it('strictly forbids rounded-xl and rounded-2xl in tracking components to comply with TC-DS-04', () => {
      expect(attachmentFieldSrc).not.toContain('rounded-xl');
      expect(attachmentFieldSrc).not.toContain('rounded-2xl');
      expect(dateCellSrc).not.toContain('rounded-xl');
      expect(dateCellSrc).not.toContain('rounded-2xl');
      expect(trackingTsxSrc).not.toContain('rounded-xl');
      expect(trackingTsxSrc).not.toContain('rounded-2xl');
    });

    it('uses rounded-xs (2px) and rounded-sm (max 4px) for all boxes, cards, and modal dialogs', () => {
      expect(attachmentFieldSrc).toContain('rounded-xs');
      expect(dateCellSrc).toContain('rounded-xs');
    });

    it('integrates AttachmentCell into Column 28 (ncc_giando) and Column 35 (ncc_file1)', () => {
      expect(trackingTsxSrc).toContain('<AttachmentCell');
      expect(trackingTsxSrc).toMatch(/field="ncc_giando"/);
      expect(trackingTsxSrc).toMatch(/field="ncc_file1"/);
    });

    it('integrates DateCell into Column 18 (ngay_gui_QT), 20 (han_tra), 24 (ncc_ngay_qt), 25 (ncc_ngay_tra_qt)', () => {
      expect(trackingTsxSrc).toContain('<DateCell');
      expect(trackingTsxSrc).toMatch(/field="ngay_gui_QT"/);
      expect(trackingTsxSrc).toMatch(/field="han_tra"/);
      expect(trackingTsxSrc).toMatch(/field="ncc_ngay_qt"/);
      expect(trackingTsxSrc).toMatch(/field="ncc_ngay_tra_qt"/);
    });
  });

  describe('TC-ATT-05: Cloud Domain Detection & Multi-URL Parsing (Idea 1)', () => {
    it('detects cloud providers accurately from URL domains', () => {
      expect(detectCloudSource('https://drive.google.com/file/d/1B2C3D/view?usp=sharing')).toBe('gdrive');
      expect(detectCloudSource('https://onedrive.live.com/?authkey=%21A1B2C&id=123')).toBe('onedrive');
      expect(detectCloudSource('https://dynamomes.sharepoint.com/:x:/r/sites/QC/certs/lot9615.xlsx')).toBe('sharepoint');
      expect(detectCloudSource('https://example.com/assets/drawing.pdf')).toBe('generic');
      expect(detectCloudSource('data:image/png;base64,iVBORw0KGgo=')).toBe('generic');
    });

    it('parses multi-line or comma separated URLs into structured AttachmentItems', () => {
      const rawInput = `
        https://drive.google.com/file/d/111/view
        https://onedrive.live.com/doc2
        https://dynamomes.sharepoint.com/doc3.xlsx, https://example.com/drawing.png
      `;
      const items = parseMultiUrls(rawInput, 'Chứng chỉ');
      expect(items.length).toBe(4);
      expect(items[0]!.source).toBe('gdrive');
      expect(items[1]!.source).toBe('onedrive');
      expect(items[2]!.source).toBe('sharepoint');
      expect(items[3]!.type).toBe('image');
    });

    it('filters out invalid or empty URLs cleanly', () => {
      const dirtyInput = 'not-a-url\n\n   https://drive.google.com/valid   \njust some text';
      const items = parseMultiUrls(dirtyInput);
      expect(items.length).toBe(1);
      expect(items[0]!.url).toBe('https://drive.google.com/valid');
    });
  });

  describe('TC-ATT-06: Smart Match File to Lot Identifier (Batch Mode Matching)', () => {
    it('matches file name to lot code or part drawing code ignoring case and extensions', () => {
      expect(smartMatchFileToLot('9690-C17_Cert_HeatTreatment.pdf', '9690-C17', '9690-C17')).toBe(true);
      expect(smartMatchFileToLot('[DAC]_2439-p2_report.xlsx', '2439-P2', 'MOLD-2439-P2')).toBe(true);
      expect(smartMatchFileToLot('GIAN_DO_NHIET_Q26102293D54F.png', '9690-C17', 'Q26102293D54F')).toBe(true);
      expect(smartMatchFileToLot('completely_different_file.pdf', '9690-C17', 'PIN-A12')).toBe(false);
    });
  });
});
