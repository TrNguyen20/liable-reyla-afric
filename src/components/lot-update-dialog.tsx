import { useState } from 'react';
import { ArrowRight, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDynamo } from '@/components/dynamo-shell';
import { getVendorScope } from '@/lib/dynamo-auth';
import { date, type QTItem, type Status } from '@/lib/dynamo-data';
import { appendAudit, nextMoves, validateUpdate, type Draft } from '@/lib/dynamo-workflow';
import { updateLotProgress } from '@/lib/auth.functions';

export function LotUpdateButton({ item }: { item: QTItem }) {
  const { role, updateItem } = useDynamo();
  const vendor = getVendorScope(role);
  const isAdmin = role === 'admin';
  const [open, setOpen] = useState(false);
  const fresh = (): Draft => ({ status: item.TrangThai, ngay_nhan: item.ngay_nhan ?? '', do_cung: item.do_cung === '—' ? '' : item.do_cung, reason: '', qcPassed: false });
  const [d, setD] = useState<Draft>(fresh);
  const [errs, setErrs] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!isAdmin && !(vendor && vendor === String(item.cty_QT).toUpperCase())) return null;

  const moves = nextMoves(item.TrangThai, isAdmin);
  const needsReason = moves.find(m => m.to === d.status)?.reason ?? false;
  const set = (p: Partial<Draft>) => { setD(v => ({ ...v, ...p })); setErrs([]); setConfirm(false); };

  const save = async () => {
    const found = validateUpdate(item, d, isAdmin);
    if (found.length) { setErrs(found); return; }
    if (d.status !== item.TrangThai && !confirm) { setConfirm(true); return; }
    setBusy(true);
    const changes: Record<string, [string, string]> = {};
    if (d.status !== item.TrangThai) changes['TrangThai'] = [item.TrangThai, d.status];
    if (d.ngay_nhan !== (item.ngay_nhan ?? '')) changes['ngay_nhan_QT'] = [item.ngay_nhan ?? '', d.ngay_nhan];
    const oldHrc = item.do_cung === '—' ? '' : item.do_cung;
    if (d.do_cung.trim() !== oldHrc) changes['do_cung'] = [oldHrc, d.do_cung.trim()];
    if (!Object.keys(changes).length) { setBusy(false); setErrs(['Chưa có thay đổi nào để lưu.']); return; }
    const res = await updateLotProgress({ data: {
      code: window.localStorage.getItem('dynamo-code') ?? '', webhook: window.localStorage.getItem('dynamo-webhook') ?? '',
      ID_Key: item.ID_Key, cty_QT: String(item.cty_QT), updates: { TrangThai: d.status, do_cung: d.do_cung.trim(), ngay_nhan_QT: d.ngay_nhan },
    } }).catch(() => ({ ok: false as const, error: 'Không kết nối được máy chủ.' }));
    setBusy(false);
    const base = { ID_Key: item.ID_Key, user: window.localStorage.getItem('dynamo-user') ?? '—', role, from: item.TrangThai, to: d.status, changes, reason: d.reason.trim() };
    if (!res.ok) {
      // Keep the draft so the user can retry without retyping; the same ID_Key update is idempotent on the sheet.
      appendAudit({ ...base, result: 'sync_failed', error: res.error });
      setErrs([`Chưa ghi được lên Google Sheet: ${res.error}. Dữ liệu chưa thay đổi — bấm Thử lại.`]); setConfirm(false);
      return;
    }
    updateItem(item.ID_Key, { TrangThai: d.status, do_cung: d.do_cung.trim() || '—', ngay_nhan: d.ngay_nhan || undefined });
    appendAudit({ ...base, result: 'ok' });
    toast.success(`Đã lưu và ghi lên Google Sheet: lô ${item.ID_Key}`); setOpen(false);
  };

  const field = 'mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
  const showDate = d.status === 'Kiểm tra QC' || d.status === 'Đã nhập kho' || !!item.ngay_nhan;
  const showHrc = d.status === 'Kiểm tra QC' || d.status === 'Đã nhập kho';
  return <>
    <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => { setD(fresh()); setErrs([]); setConfirm(false); setOpen(true); }}><Zap size={13} />Cập nhật</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Cập nhật lô {item.ID_Key}</DialogTitle></DialogHeader>
        <dl className="grid grid-cols-2 gap-2 border border-border bg-secondary/50 p-3 text-xs">
          {([['Mã hàng', item.ma_hang], ['Đơn hàng', item.So_DatHang], ['Vendor', item.cty_QT], ['Hạn trả', item.han_tra ? date(item.han_tra) : 'Chưa có']] as const).map(([k, v]) => <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
        </dl>
        <div className="space-y-3 text-sm">
          <label className="block">Trạng thái mới
            <select className={field} value={d.status} onChange={e => set({ status: e.target.value as Status })}>
              <option value={item.TrangThai}>{item.TrangThai} (giữ nguyên)</option>
              {moves.map(m => <option key={m.to} value={m.to}>{m.to}{m.reason ? ' — cần lý do' : ''}</option>)}
            </select>
          </label>
          {d.status !== item.TrangThai && <p className="flex items-center gap-2 text-xs font-semibold"><span className="text-muted-foreground">{item.TrangThai}</span><ArrowRight size={13} /><span className="text-primary">{d.status}</span></p>}
          {showDate && <label className="block">Ngày nhận thực tế<input type="date" className={field} value={d.ngay_nhan} onChange={e => set({ ngay_nhan: e.target.value })} /></label>}
          {showHrc && <label className="block">Độ cứng thực tế<input className={field} value={d.do_cung} placeholder="58-62 HRC" onChange={e => set({ do_cung: e.target.value })} /></label>}
          {d.status === 'Đã nhập kho' && item.TrangThai !== 'Đã nhập kho' && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={d.qcPassed} onChange={e => set({ qcPassed: e.target.checked })} />Tôi xác nhận lô đã QC đạt</label>}
          {needsReason && <label className="block">Lý do<textarea className={`${field} h-20 py-2`} value={d.reason} onChange={e => set({ reason: e.target.value })} placeholder="VD: Độ cứng không đạt, trả vendor gia công lại" /></label>}
          {errs.length > 0 && <ul role="alert" className="space-y-1 border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{errs.map(e => <li key={e}>{e}</li>)}</ul>}
          {confirm && <p className="border border-warning/40 bg-warning/10 p-3 text-xs">Xác nhận chuyển <b>{item.TrangThai}</b> → <b>{d.status}</b>? Bấm lại để lưu.</p>}
        </div>
        <DialogFooter><Button disabled={busy} onClick={save}>{busy ? 'Đang ghi…' : confirm ? 'Xác nhận & lưu' : errs.some(e => e.startsWith('Chưa ghi')) ? 'Thử lại' : 'Lưu & ghi lên Sheet'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

