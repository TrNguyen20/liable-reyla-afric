import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  DatabaseZap,
  Globe,
  LayoutDashboard,
  LogOut,
  Moon,
  Package,
  RefreshCw,
  Sun,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useDynamo } from "@/components/dynamo-shell";
import { formatVendorName } from "@/lib/dynamo-auth";
import { type QTItem, type Workshop } from "@/lib/dynamo-data";
import { useTranslation } from "@/i18n";

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
  const { t, locale } = useTranslation();
  const [search, setSearch] = React.useState("");

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

  const handleSelectNav = (path: "/tracking" | "/dashboard" | "/orders" | "/sync") => {
    onOpenChange(false);
    navigate({ to: path });
  };

  const handleSelectWorkshop = (ws: "Tất cả" | Workshop) => {
    setWorkshop(ws);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={t("common.command.placeholder")}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[380px]">
        <CommandEmpty>{t("common.command.empty")}</CommandEmpty>

        {searchResults.length > 0 && (
          <CommandGroup heading={t("common.command.matchedLots")}>
            {searchResults.map((item) => {
              return (
                <CommandItem
                  key={item.ID_Key}
                  value={`${item.ma_hang} ${item.ID_Key} ${item.So_DatHang} ${item.vat_lieu}`}
                  onSelect={() => {
                    onOpenChange(false);
                    navigate({ to: "/tracking" });
                  }}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-xs bg-secondary font-mono text-[11px] font-bold text-primary">
                      {item.phong_sx}
                    </span>
                    <div className="truncate">
                      <p className="font-mono text-xs font-bold text-foreground truncate">
                        {item.ma_hang}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground truncate">
                        {item.ID_Key} · {t("common.command.orderPrefix")} {item.So_DatHang} ·{" "}
                        {item.vat_lieu} · {formatVendorName(item.cty_QT, role, locale)}
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

        <CommandGroup heading={t("common.command.quickNav")}>
          <CommandItem onSelect={() => handleSelectNav("/tracking")}>
            <ArrowLeftRight className="mr-2 h-4 w-4 text-primary" />
            <span>{t("nav.route1Title")}</span>
            <CommandShortcut>{t("nav.trackingShortcut")}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelectNav("/dashboard")}>
            <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
            <span>{t("nav.route2Title")}</span>
            <CommandShortcut>{t("nav.dashboardShortcut")}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelectNav("/orders")}>
            <Package className="mr-2 h-4 w-4 text-primary" />
            <span>{t("nav.route3Title")}</span>
            <CommandShortcut>{t("nav.ordersShortcut")}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelectNav("/sync")}>
            <DatabaseZap className="mr-2 h-4 w-4 text-primary" />
            <span>{t("nav.route4Title")}</span>
            <CommandShortcut>{t("nav.syncShortcut")}</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("common.command.workshopFilter")}>
          {(["Tất cả", "PIN", "INSERT", "MOLD"] as const).map((ws) => (
            <CommandItem key={ws} onSelect={() => handleSelectWorkshop(ws)}>
              <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>
                {ws === "Tất cả"
                  ? t("common.command.allWorkshops")
                  : t("common.command.workshopPrefix", { ws })}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("common.command.systemActions")}>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              resetDataset();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{t("common.command.pullData")}</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onToggleTheme();
            }}
          >
            <Sun className="mr-2 h-4 w-4 text-muted-foreground dark:hidden" />
            <Moon className="mr-2 h-4 w-4 text-muted-foreground hidden dark:inline" />
            <span>{t("common.command.toggleTheme")}</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onLogout();
            }}
            className="text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4 text-destructive" />
            <span>{t("common.command.logout")}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
