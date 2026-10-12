import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function WebhookConfig() {
  const [url, setUrl] = useState('');
  useEffect(() => { setUrl(window.localStorage.getItem('dynamo-webhook') ?? ''); }, []);
  const save = () => {
    const v = url.trim();
    if (v && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(v)) { toast.error('Link phải có dạng https://script.google.com/macros/s/.../exec'); return; }
    window.localStorage.setItem('dynamo-webhook', v); toast.success('Đã lưu link Webhook cập nhật lô.');
  };
  return <div className="mb-6 border border-border bg-card p-4">
    <p className="text-[10px] font-bold tracking-[.18em] text-primary">GHI NGƯỢC GOOGLE SHEET</p>
    <p className="mt-1 text-xs text-muted-foreground">Link Web App Apps Script nhận cập nhật TrangThai / ngay_nhan_QT / do_cung từ đối tác.</p>
    <div className="mt-3 flex gap-2"><input className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm" placeholder="https://script.google.com/macros/s/.../exec" value={url} onChange={e => setUrl(e.target.value)} /><Button onClick={save}>Lưu</Button></div>
  </div>;
}

