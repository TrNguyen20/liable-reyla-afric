import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Globe, Link2, Send } from "lucide-react";
import { useTranslation } from "@/i18n";

export function WebhookConfig() {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("dynamo-webhook") ?? "";
      setUrl(stored);
      setIsSaved(Boolean(stored));
    }
  }, []);

  const save = () => {
    const v = url.trim();
    if (v && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(v)) {
      toast.error(t("sync.webhook.toasts.urlInvalid"));
      return;
    }
    if (typeof window !== "undefined") {
      if (v) {
        window.localStorage.setItem("dynamo-webhook", v);
        setIsSaved(true);
        toast.success(t("sync.webhook.toasts.saveSuccess"));
      } else {
        window.localStorage.removeItem("dynamo-webhook");
        setIsSaved(false);
        toast.info(t("sync.webhook.toasts.deleteSuccess"));
      }
    }
  };

  return (
    <div className="mes-card mb-4.5 overflow-hidden p-4 sm:p-4.5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xs bg-primary/10 text-primary">
            <Globe size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("sync.webhook.badge")}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                  isSaved
                    ? "border border-run/30 bg-run/10 text-run"
                    : "border border-border bg-muted/40 text-muted-foreground"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${isSaved ? "bg-run animate-pulse" : "bg-muted-foreground"}`}
                />
                {isSaved
                  ? t("sync.webhook.statusConnected")
                  : t("sync.webhook.statusNotConfigured")}
              </span>
            </div>
            <h2 className="font-display text-sm font-bold tracking-tight text-foreground">
              {t("sync.webhook.title")}
            </h2>
          </div>
        </div>

        <div className="text-right text-[11px] text-muted-foreground">
          {t("sync.webhook.autoPush")}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-muted-foreground">
            POST
          </span>
          <input
            className="h-10 w-full rounded-xs border border-input bg-background/50 pl-14 pr-3 font-mono text-xs text-foreground placeholder:font-sans placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            placeholder={
              t("sync.webhook.urlPlaceholder") ||
              "https://script.google.com/macros/s/AKfycbx.../exec"
            }
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setIsSaved(false);
            }}
          />
        </div>
        <Button
          onClick={save}
          className="h-10 shrink-0 gap-1.5 rounded-xs bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90"
        >
          {isSaved ? <CheckCircle2 size={14} /> : <Send size={14} />}
          {isSaved ? t("sync.webhook.saved") : t("sync.webhook.save")}
        </Button>
      </div>

      <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Link2 size={13} className="shrink-0 text-primary" />
        {t("sync.webhook.description")}
      </p>
    </div>
  );
}
