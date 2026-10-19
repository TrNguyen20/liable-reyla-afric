import { useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { date, money, number, type QTItem } from '@/lib/dynamo-data';
import { canViewPricing, formatVendorName, type Role } from '@/lib/dynamo-auth';
import logo from '@/assets/dynamo-logo.png';

/** Printable delivery & heat-treatment work order, built from live row data. Pricing is shown only to roles allowed by the session. */
export function JobTicketButton({ item, role }: { item: QTItem; role: Role }) {
  const [open, setOpen] = useState(false);
  const pricing = canViewPricing(role);
  const Field = ({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) => (
    <div className="border-b border-r border-border p-2.5">
      <p className="text-[10px] font-semibold text-muted-foreground">{k}</p>
      <p className={`mt-0.5 text-sm font-bold text-foreground ${mono ? 'font-mono tabular-nums' : ''}`}>{v || '—'}</p>
    </div>
  );
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title={`Mở phiếu ${item.ma_hang}`} aria-label={`Mở phiếu giao nhận ${item.ma_hang}`} className="inline-flex rounded-sm p-1 text-primary transition-colors hover:bg-primary/10 active:scale-95">
        <FileText size={16} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="job-ticket-dialog max-h-[92vh] max-w-3xl overflow-y-auto p-0">
          <div className="job-ticket bg-card p-6 text-foreground">
            <header className="flex items-start justify-between gap-4 border-b-2 border-foreground pb-3">
              <img src={logo} alt="Dynamo Vietnam" className="h-10 w-auto" />
              <div className="text-right">
                <DialogTitle className="text-base font-black">Phiếu giao nhận &amp; lệnh gia công</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">Nhiệt luyện / xi mạ · Số ĐH <b className="font-mono text-foreground">{item.So_DatHang}</b></DialogDescription>
              </div>
            </header>
            <div className="mt-4 grid grid-cols-2 border-l border-t border-border sm:grid-cols-4">
              <Field k="Mã hàng" v={item.ma_hang} mono />
              <Field k="Mã truy vết" v={item.ID_Key} mono />
              <Field k="Phân xưởng" v={item.phong_sx} />
              <Field k="Đơn vị gia công" v={formatVendorName(item.cty_QT, role)} />
              <Field k="Mác thép" v={item.vat_lieu} />
              <Field k="Độ cứng yêu cầu" v={item.do_cung} mono />
              <Field k="Kích thước" v={item.Kich_Thuoc_SP} mono />
              <Field k="Trạng thái" v={item.TrangThai} />
              <Field k="Số lượng" v={`${number(item.so_luong)} ${item.don_vi_tinh ?? ''}`} mono />
              <Field k="Khối lượng lô" v={`${number(item.kg_Lot, 1)} kg`} mono />
              <Field k="Ngày gửi" v={date(item.ngay_gui_QT)} mono />
              <Field k="Hạn trả" v={item.han_tra ? date(item.han_tra) : 'Chưa có'} mono />
              {pricing && <Field k="Đơn giá" v={money(item.don_gia)} mono />}
              {pricing && <Field k="Thành tiền" v={money(item.thanh_tien)} mono />}
            </div>
            <div className="mt-4 rounded-sm border border-border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground">Ghi chú kỹ thuật</p>
              <div className="mt-6 border-b border-dashed border-border" />
              <div className="mt-6 border-b border-dashed border-border" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-6 text-center text-xs">
              {['Bên giao (Dynamo QT)', 'Bên nhận (đơn vị gia công)'].map(s => (
                <div key={s}><p className="font-bold">{s}</p><p className="text-[10px] text-muted-foreground">Ký, ghi rõ họ tên, ngày</p><div className="mt-14 border-b border-border" /></div>
              ))}
            </div>
            <p className="mt-6 text-center text-[10px] text-muted-foreground">Kỷ luật - Chính xác - An toàn - Đúng hạn</p>
          </div>
          <div className="job-ticket-actions flex justify-end gap-2 border-t border-border bg-secondary/30 px-6 py-3">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Đóng</Button>
            <Button size="sm" className="gap-1.5 active:scale-[0.98]" onClick={() => window.print()}><Printer size={14} /> In / lưu PDF</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
