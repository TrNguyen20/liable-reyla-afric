import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Download, FileText, Package, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeading, useDynamo } from '@/components/dynamo-shell';
import { date, money, number, type QTItem } from '@/lib/dynamo-data';
import { StatusDot } from './dashboard';
import { LotUpdateButton } from '@/components/lot-update-dialog';
import { daysOver, isDueSoon, isMissingDue, isOverdue } from '@/lib/dynamo-rules';
const dueTag=(i:QTItem)=>isOverdue(i)?{t:`Quá hạn ${daysOver(i)}n`,c:'border-destructive/40 bg-destructive/10 text-destructive'}:isDueSoon(i)?{t:'Cận hạn 48h',c:'border-warning/40 bg-warning/10 text-warning'}:isMissingDue(i)?{t:i.han_tra_est?'Hạn ước tính':'Thiếu hạn trả',c:'border-border bg-secondary text-muted-foreground'}:null;
export const Route = createFileRoute('/orders')({head:()=>({meta:[{title:'Đơn đặt hàng | DYNAMO VIETNAM QT - MES'},{name:'description',content:'Chi tiết đơn đặt hàng và linh kiện gia công nhiệt luyện, xi mạ.'},{property:'og:title',content:'Đơn đặt hàng | DYNAMO VIETNAM QT - MES'},{property:'og:description',content:'Tra cứu đơn đặt hàng và chi tiết linh kiện QT.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:Orders});
const LIST_LIMIT = 100;
const ROW_LIMIT = 150;
function Orders(){
  const {filtered}=useDynamo();
  const [selected,setSelected]=useState<string | null>(null);
  const [localSearch,setLocalSearch]=useState('');
  const {groups,byOrder}=useMemo(()=>{
    const byOrder=new Map<string,QTItem[]>();
    for(const i of filtered){const list=byOrder.get(i.So_DatHang);if(list)list.push(i);else byOrder.set(i.So_DatHang,[i]);}
    const q=localSearch.trim().toLowerCase();
    const groups=[...byOrder.keys()].sort().reverse().filter(id=>!q||id.toLowerCase().includes(q)||byOrder.get(id)!.some(i=>i.ma_hang.toLowerCase().includes(q)));
    return {groups,byOrder};
  },[filtered,localSearch]);
  const active=selected&&byOrder.has(selected)?selected:groups[0];
  const rows=active?byOrder.get(active)??[]:[];
  const shown=rows.slice(0,ROW_LIMIT);
  const first=rows[0];
  const total=rows.reduce((a,i)=>a+i.thanh_tien,0);
  const visibleGroups=groups.slice(0,LIST_LIMIT);
  const exportCsv=()=>{const keys:(keyof QTItem)[]=['ID_Key','phong_sx','ma_hang','so_luong','vat_lieu','do_cung','Kich_Thuoc_SP','kg_Lot','don_vi_tinh','don_gia','thanh_tien','ngay_gui_QT','cty_QT','TrangThai','So_DatHang','han_tra'];const content=[keys.join(','),...rows.map(r=>keys.map(k=>`"${String(r[k]??'').replaceAll('"','""')}"`).join(','))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+content],{type:'text/csv;charset=utf-8'}));a.download=`${active}-chi-tiet.csv`;a.click();URL.revokeObjectURL(a.href)};
  return <><PageHeading eyebrow="ĐƠN ĐẶT HÀNG / CHI TIẾT" title="Đơn gia công QT" description="Tra cứu đơn hàng, chi tiết linh kiện và chi phí theo từng lô."/>
  <div className="grid min-h-[610px] grid-cols-1 border border-border bg-card lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[310px_minmax(0,1fr)]">
    <div className="border-b border-border lg:border-b-0 lg:border-r">
      <div className="border-b border-border p-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">Danh sách đơn</h2><span className="text-xs text-muted-foreground">{groups.length.toLocaleString('vi-VN')} đơn</span></div>
        <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input value={localSearch} onChange={e=>setLocalSearch(e.target.value)} placeholder="Lọc mã đơn, mã hàng..." aria-label="Lọc danh sách đơn" className="h-9 w-full rounded border border-input bg-background pl-9 pr-3 text-xs outline-none focus:border-primary"/></div>
      </div>
      <div className="max-h-[520px] overflow-y-auto">
        {visibleGroups.map(id=>{const g=byOrder.get(id)!;return <Button key={id} variant="ghost" onClick={()=>setSelected(id)} className={`h-auto w-full justify-start rounded-none border-b border-border px-4 py-4 text-left hover:bg-accent ${active===id?'border-l-2 border-l-primary bg-primary/10':''}`}><span className="block w-full"><span className="flex items-center justify-between gap-2"><b className="font-mono text-xs">{id}</b><span className="flex items-center gap-1">{(()=>{const o=g.filter(r=>isOverdue(r)).length,d=g.filter(r=>isDueSoon(r)).length;return <>{o>0&&<span className="rounded-sm bg-destructive/15 px-1.5 text-[10px] font-bold text-destructive">{o} trễ</span>}{d>0&&<span className="rounded-sm bg-warning/15 px-1.5 text-[10px] font-bold text-warning">{d} cận</span>}</>})()}<span className="text-[10px] text-muted-foreground">{g.length} mã</span></span></span><span className="mt-2 flex justify-between text-[11px] font-normal text-muted-foreground"><span>{[...new Set(g.map(i=>i.phong_sx))].join(', ')} · {g[0]?.cty_QT}</span><span>{date(g[0]?.ngay_gui_QT??'')}</span></span><span className="mt-2 block text-xs font-semibold text-foreground">{money(g.reduce((a,i)=>a+i.thanh_tien,0))}</span></span></Button>})}
        {groups.length>LIST_LIMIT&&<p className="p-4 text-center text-[11px] text-muted-foreground">Hiển thị {LIST_LIMIT}/{groups.length.toLocaleString('vi-VN')} đơn — dùng ô lọc để tìm nhanh</p>}
        {!groups.length&&<p className="p-5 text-center text-xs text-muted-foreground">{localSearch?`Không tìm thấy đơn khớp "${localSearch}"`:'Chưa có đơn hàng trong phạm vi lọc'}</p>}
      </div>
    </div>
    <div className="min-w-0">{first ? <>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5"><div><p className="mb-2 text-[10px] font-semibold tracking-[.13em] text-primary">CHI TIẾT ĐƠN ĐẶT HÀNG</p><h2 className="font-display text-xl font-bold">{active}</h2><p className="mt-2 text-xs text-muted-foreground">{first.cty_QT} <span className="mx-2">·</span> Gửi ngày {date(first.ngay_gui_QT)} <span className="mx-2">·</span> {rows.length.toLocaleString('vi-VN')} mã linh kiện</p></div><Button variant="outline" size="sm" onClick={exportCsv}><Download size={14}/> Xuất CSV</Button></div>
      <div className="grid grid-cols-2 gap-4 border-b border-border p-5 sm:grid-cols-4"><Summary label="PHÂN XƯỞNG" value={[...new Set(rows.map(i=>i.phong_sx))].join(', ')}/><Summary label="ĐỐI TÁC" value={first.cty_QT}/><Summary label="TỔNG KHỐI LƯỢNG" value={`${number(rows.reduce((a,i)=>a+i.kg_Lot,0),1)} kg`}/><Summary label="TỔNG GIÁ TRỊ" value={money(total)}/></div>
      {(()=>{const o=rows.filter(r=>isOverdue(r)).length,d=rows.filter(r=>isDueSoon(r)).length,m=rows.filter(isMissingDue).length;return (o||d||m)?<div className="flex flex-wrap gap-2 border-b border-border px-5 py-3 text-[11px]">{o>0&&<span className="border border-destructive/40 bg-destructive/10 px-2 py-1 font-semibold text-destructive">{o} lô quá hạn</span>}{d>0&&<span className="border border-warning/40 bg-warning/10 px-2 py-1 font-semibold text-warning">{d} lô cận hạn 48h</span>}{m>0&&<span className="border border-border bg-secondary px-2 py-1 text-muted-foreground">{m} lô thiếu hạn trả chính thức</span>}</div>:null})()}
      <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-xs"><thead className="bg-secondary/60 text-[10px] tracking-wide text-muted-foreground"><tr>{['MÃ HÀNG','MÁC THÉP / HRC','KÍCH THƯỚC','SL','KHỐI LƯỢNG','ĐƠN GIÁ','THÀNH TIỀN','HẠN TRẢ','TRẠNG THÁI','PDF',''].map(t=><th key={t} className="px-4 py-3 font-semibold">{t}</th>)}</tr></thead><tbody>{shown.map(i=>{const tag=dueTag(i);return <tr key={i.ID_Key} className={`border-t border-border align-top hover:bg-accent/40 ${isOverdue(i)?'bg-destructive/5':''}`}><td className="px-4 py-4"><p className="font-mono font-semibold text-foreground">{i.ma_hang}</p><p className="mt-1 text-[10px] text-muted-foreground">{i.ID_Key}</p></td><td className="px-4 py-4"><p className="font-semibold">{i.vat_lieu}</p><p className="mt-1 text-muted-foreground">{i.do_cung}</p></td><td className="whitespace-nowrap px-4 py-4 text-muted-foreground">{i.Kich_Thuoc_SP}</td><td className="px-4 py-4">{number(i.so_luong)}</td><td className="whitespace-nowrap px-4 py-4">{number(i.kg_Lot,1)} kg</td><td className="whitespace-nowrap px-4 py-4">{money(i.don_gia)}<p className="text-[10px] text-muted-foreground">/{i.don_vi_tinh}</p></td><td className="whitespace-nowrap px-4 py-4 font-semibold">{money(i.thanh_tien)}</td><td className="whitespace-nowrap px-4 py-4">{i.han_tra?date(i.han_tra):'—'}{tag&&<span className={`mt-1 block w-fit border px-1.5 py-0.5 text-[10px] font-semibold ${tag.c}`}>{tag.t}</span>}</td><td className="px-4 py-4"><StatusDot status={i.TrangThai}/></td><td className="px-4 py-4"><a href={`/sample-pdfs/${i.ID_Key}.pdf`} target="_blank" rel="noopener noreferrer" aria-label={`Xem PDF mẫu ${i.ma_hang}`} title="Xem PDF mẫu" className="inline-flex text-primary hover:text-primary/80"><FileText size={16}/></a></td><td className="px-4 py-4"><LotUpdateButton item={i}/></td></tr>})}</tbody></table></div>
      {rows.length>ROW_LIMIT&&<p className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground">Hiển thị {ROW_LIMIT}/{rows.length.toLocaleString('vi-VN')} dòng đầu — xuất CSV để tải toàn bộ</p>}
      <div className="flex justify-end gap-5 border-t border-border bg-secondary/40 p-5 text-sm"><span className="text-muted-foreground">Tổng cộng</span><strong className="font-display text-lg text-primary">{money(total)}</strong></div>
      <div className="px-5 pb-5 text-[11px] text-muted-foreground">Tệp PDF là phiếu thông tin minh họa, không phải chứng từ thực tế.</div>
    </> : <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 text-muted-foreground"><Package size={28}/><p className="text-sm">Không có đơn hàng phù hợp bộ lọc</p></div>}</div>
  </div></>;
}
function Summary({label,value}:{label:string;value:string}){return <div><p className="text-[10px] font-semibold tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-sm font-bold">{value}</p></div>}

