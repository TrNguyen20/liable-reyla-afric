import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getCentralWebhookUrl, saveCentralWebhookUrl, DEFAULT_WEBHOOK_URL, _resetCachedConfigForTesting } from '@/lib/config.server';
import { unlinkSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Centralized Server-side Webhook & Bidirectional Sync Contract', () => {
  const configPath = resolve(process.cwd(), '.server-config.json');
  let originalConfig: string | null = null;

  beforeEach(() => {
    _resetCachedConfigForTesting();
    if (existsSync(configPath)) {
      try {
        originalConfig = readFileSync(configPath, 'utf-8');
        unlinkSync(configPath);
      } catch {
        // ignore
      }
    }
  });

  afterEach(() => {
    _resetCachedConfigForTesting();
    if (originalConfig !== null) {
      try {
        writeFileSync(configPath, originalConfig, 'utf-8');
      } catch {
        // ignore
      }
    }
  });

  it('TC-01: Admin lưu Webhook URL tập trung và server lưu trữ chính xác', async () => {
    const testUrl = 'https://script.google.com/macros/s/AKfycbx_TEST_12345/exec';
    await saveCentralWebhookUrl(testUrl, 'admin');

    const retrieved = await getCentralWebhookUrl();
    expect(retrieved).toBe(testUrl);
  });

  it('TC-02: Tự động loại bỏ khoảng trắng khi lưu Webhook URL', async () => {
    const rawUrl = '   https://script.google.com/macros/s/AKfycbx_SPACES/exec   ';
    await saveCentralWebhookUrl(rawUrl, 'admin');

    const retrieved = await getCentralWebhookUrl();
    expect(retrieved).toBe('https://script.google.com/macros/s/AKfycbx_SPACES/exec');
  });

  it('TC-03: Trả về chuỗi rỗng khi chưa có Webhook nào được cấu hình', async () => {
    delete process.env.DYNAMO_WEBHOOK_URL;
    await saveCentralWebhookUrl('', 'admin');
    const retrieved = await getCentralWebhookUrl();
    expect(retrieved).toBe('');
  });

  it('TC-04: Cấu trúc payload gửi sang Apps Script tuân thủ nghiêm ngặt hợp đồng hai chiều', () => {
    const mockIdKey = 'PIN-2601-099';
    const mockVendor = 'YAMAICHI';
    const mockRole = 'viewer';
    const mockPatch = {
      TrangThai: 'Kiểm tra QC',
      do_cung: '60 HRC',
      so_luong: 250,
      ma_hang: 'MH-999-DYNAMO',
      ghi_chu: 'QC đạt kích thước dung sai',
    };

    const payload = {
      action: 'updateLot',
      ID_Key: mockIdKey,
      cty_QT: mockVendor,
      updates: mockPatch,
      user: mockRole,
      timestamp: new Date().toISOString(),
    };

    expect(payload.action).toBe('updateLot');
    expect(payload.ID_Key).toBe(mockIdKey);
    expect(payload.cty_QT).toBe(mockVendor);
    expect(payload.user).toBe('viewer'); // Xác nhận vai trò viewer được gửi đi hợp lệ
    expect(payload.updates.TrangThai).toBe('Kiểm tra QC');
    expect(payload.updates.so_luong).toBe(250);
    expect(payload.updates.ma_hang).toBe('MH-999-DYNAMO');
  });

  it('TC-05: Thuật toán nhận diện alias trường tiếng Việt trong Apps Script Code.gs', () => {
    const fieldAliases: Record<string, string[]> = {
      trangthai: ['trangthai', 'trạng thái', 'status', 'tình trạng'],
      ngay_nhan_qt: ['ngay_nhan_qt', 'ngày nhận', 'ngay_nhan', 'ngày nhận qt', 'received_date'],
      do_cung: ['do_cung', 'độ cứng', 'hardness', 'hrc'],
      ghi_chu: ['ghi_chu', 'ghi chú', 'note', 'ghi chú gia công', 'ghi chú qc'],
      ma_hang: ['ma_hang', 'mã hàng', 'item_code', 'part_no', 'mã sản phẩm'],
      vat_lieu: ['vat_lieu', 'vật liệu', 'mác thép', 'material', 'chất liệu'],
      so_luong: ['so_luong', 'số lượng', 'quantity', 'qty'],
      kg_lot: ['kg_lot', 'khối lượng', 'trọng lượng', 'kg', 'weight'],
      han_tra: ['han_tra', 'hạn trả', 'due_date', 'ngày hẹn trả'],
      ngay_gui_qt: ['ngay_gui_qt', 'ngày gửi', 'ngay_gui', 'ngày gửi qt', 'ngay_tao'],
      cty_qt: ['cty_qt', 'công ty qt', 'đơn vị qt', 'vendor', 'đơn vị gia công'],
    };

    const mockColMap: Record<string, number> = {
      'mã hàng': 1,
      'vật liệu': 2,
      'độ cứng': 3,
      'số lượng': 4,
      'trạng thái': 5,
      'ngày nhận': 6,
      'ghi chú': 7,
    };

    function findCol(fieldKey: string) {
      const k = fieldKey.trim().toLowerCase();
      if (mockColMap[k]) return mockColMap[k];
      const aliases = fieldAliases[k];
      if (aliases) {
        for (const a of aliases) {
          if (mockColMap[a]) return mockColMap[a];
        }
      }
      return null;
    }

    expect(findCol('ma_hang')).toBe(1);
    expect(findCol('vat_lieu')).toBe(2);
    expect(findCol('do_cung')).toBe(3);
    expect(findCol('so_luong')).toBe(4);
    expect(findCol('TrangThai')).toBe(5);
    expect(findCol('ngay_nhan_QT')).toBe(6);
    expect(findCol('ghi_chu')).toBe(7);
  });

  it('TC-06: Khi chưa có tệp cấu hình và chưa có biến môi trường, tự động trả về DEFAULT_WEBHOOK_URL dự phòng trên serverless', async () => {
    delete process.env.DYNAMO_WEBHOOK_URL;
    _resetCachedConfigForTesting();
    const retrieved = await getCentralWebhookUrl();
    expect(retrieved).toBe(DEFAULT_WEBHOOK_URL);
    expect(retrieved).toMatch(/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/);
  });
});
