import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeftRight,
  DatabaseZap,
  Globe,
  LayoutDashboard,
  LogOut,
  Moon,
  RefreshCw,
  Search,
  Sun,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useDynamo } from '@/components/dynamo-shell';
import { formatVendorName, type Role } from '@/lib/dynamo-auth';
import { type QTItem, type Workshop } from '@/lib/dynamo-data';
import { isOverdue } from '@/lib/dynamo-rules';

export function CommandPalette({
  open,
  onOpenChange,
  onToggleTheme,
  onLogout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const { dataset, role, setWorkshop, resetDataset } = useDynamo();
  const [search, setSearch] = React.useState('');

  const searchResults = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    const hits: QTItem[] = [];
    for (const item of dataset) {
      if (
        item.ma_hang.toLowerCase().includes(q) ||
        item.ID_Key.toLowerCase().includes(q) ||
        item.So_DatHang.toLowerCase().includes(q) ||
        item.vat_lieu.toLowerCase().includes(q)
      ) {
        hits.push(item);
        if (hits.length >= 20) break;
      }
    }
    return hits;
  }, [dataset, search]);

  const handleSelectNav = (path: '/tracking' | '/sync') => {
    onOpenChange(false);
    navigate({ to: path });
  };

  const handleSelectWorkshop = (ws: 'Tất cả' | Workshop) => {
    setWorkshop(ws);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Tìm kiếm mã hàng, số đơn hàng, mã lô hoặc thao tác nhanh... (ESC để đóng)"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[380px]">
        <CommandEmpty>Không tìm thấy kết quả phù hợp.</CommandEmpty>

        {searchResults.length > 0 && (
          <CommandGroup heading="LÔ HÀNG & MÃ LINH KIỆN KHỚP">
            {searchResults.map((item) => {
              return (
                <CommandItem
                  key={item.ID_Key}
                  value={`${item.ma_hang} ${item.ID_Key} ${item.So_DatHang} ${item.vat_lieu}`}
                  onSelect={() => {
                    onOpenChange(false);
                    navigate({ to: '/tracking' });
                  }}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-secondary font-mono text-[11px] font-bold text-primary">
                      {item.phong_sx}
                    </span>
                    <div className="truncate">
                      <p className="font-mono text-xs font-bold text-foreground truncate">{item.ma_hang}</p>
                      <p className="font-mono text-[10px] text-muted-foreground truncate">
                        {item.ID_Key} · Đơn: {item.So_DatHang} · {item.vat_lieu} · {formatVendorName(item.cty_QT, role)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    <span className="rounded-xs border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground font-medium">
                      {item.TrangThai}
                    </span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        <CommandGroup heading="ĐIỀU HƯỚNG NHANH">
          <CommandItem onSelect={() => handleSelectNav('/tracking')}>
            <ArrowLeftRight className="mr-2 h-4 w-4 text-primary" />
            <span>Luân chuyển nhiệt luyện QT</span>
            <CommandShortcut>Phím 1</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelectNav('/sync')}>
            <DatabaseZap className="mr-2 h-4 w-4 text-primary" />
            <span>Liên kết Google Sheets</span>
            <CommandShortcut>Phím 2</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="LỌC PHÂN XƯỞNG">
          {(['Tất cả', 'PIN', 'INSERT', 'MOLD'] as const).map((ws) => (
            <CommandItem key={ws} onSelect={() => handleSelectWorkshop(ws)}>
              <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Phân xưởng: {ws === 'Tất cả' ? 'Toàn nhà máy (ALL)' : ws}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="THAO TÁC HỆ THỐNG">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              resetDataset();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Làm mới & Kéo dữ liệu từ Google Sheets</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onToggleTheme();
            }}
          >
            <Sun className="mr-2 h-4 w-4 text-muted-foreground dark:hidden" />
            <Moon className="mr-2 h-4 w-4 text-muted-foreground hidden dark:inline" />
            <span>Chuyển đổi giao diện Sáng / Tối</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onLogout();
            }}
            className="text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4 text-destructive" />
            <span>Đăng xuất phiên làm việc</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
