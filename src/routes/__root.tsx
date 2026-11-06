import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { DynamoShell } from "@/components/dynamo-shell";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider, useTranslation } from "@/i18n";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundContent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="mes-card max-w-md p-8 text-center shadow-lg">
        <span className="font-mono text-5xl font-black tracking-tight text-primary">404</span>
        <h2 className="mt-3 font-display text-xl font-bold text-foreground">
          {t("common.notFound.title") || "Không tìm thấy tài nguyên"}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t("common.notFound.desc") ||
            "Đường dẫn yêu cầu không tồn tại trong hệ thống điều hành luân chuyển QT hoặc đã được di dời sang địa chỉ khác."}
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            to="/tracking"
            className="inline-flex items-center justify-center rounded-xs bg-primary px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
          >
            {t("common.notFound.backAction") || "Quay về Luân chuyển QT"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <I18nProvider>
      <NotFoundContent />
    </I18nProvider>
  );
}

function ErrorContent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const { t } = useTranslation();
  const [showStack, setShowStack] = useState(false);

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  const handleSelfHeal = () => {
    try {
      if (typeof window !== "undefined") {
        const keysToRemove = [
          "dynamo-local-items",
          "dynamo-audit-log",
          "dynamo-active-role",
          "dynamo-workshop-filter",
          "dynamo-audio-enabled",
        ];
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        sessionStorage.clear();
        window.location.href = "/tracking";
      }
    } catch {
      window.location.reload();
    }
  };

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="mes-card w-full max-w-lg border-l-4 border-l-destructive p-8 shadow-lg">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-destructive">
            {t("common.errorBoundary.badge") || "SỰ CỐ VẬN HÀNH / RUNTIME FAIL-SAFE"}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">FAIL-SAFE MODE</span>
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">
          {t("common.errorBoundary.title") || "Không thể kết nối hoặc kết xuất dữ liệu"}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t("common.errorBoundary.desc") ||
            "Hệ thống phát hiện lỗi ngoại lệ trong luồng runtime. Bộ tự phục hồi (Self-Healing Engine) sẵn sàng làm sạch cache hỏng và khôi phục trạng thái chuẩn để xưởng tiếp tục vận hành."}
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xs bg-primary px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-2xs transition-colors hover:bg-primary/90 cursor-pointer"
          >
            {t("common.errorBoundary.retry") || "Thử tải lại luồng"}
          </button>
          <button
            onClick={handleSelfHeal}
            className="inline-flex items-center justify-center rounded-xs border border-destructive/50 bg-destructive/10 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-destructive transition-colors hover:bg-destructive/20 cursor-pointer"
          >
            {t("common.errorBoundary.selfHeal") || "Khôi phục sạch (Self-Heal)"}
          </button>
          <a
            href="/tracking"
            className="inline-flex items-center justify-center rounded-xs border border-input bg-card px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-muted cursor-pointer"
          >
            {t("common.errorBoundary.goHome") || "Về Luân chuyển QT"}
          </a>
        </div>

        {/* Collapsible Error Log for Shopfloor Technicians */}
        <div className="mt-6 border-t border-border/80 pt-4 text-left">
          <button
            type="button"
            onClick={() => setShowStack(!showStack)}
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground underline decoration-dotted cursor-pointer"
          >
            {showStack
              ? t("common.errorBoundary.toggleLogHide") || "Ẩn nhật ký kỹ thuật ▲"
              : t("common.errorBoundary.toggleLogShow") || "Xem nhật ký ngoại lệ kỹ thuật ▼"}
          </button>
          {showStack && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-xs bg-black/80 p-3 font-mono text-[10px] text-red-300">
              <p className="font-bold text-red-200">{errorMessage}</p>
              {errorStack && (
                <pre className="mt-2 whitespace-pre-wrap opacity-80">{errorStack}</pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorComponent(props: ErrorComponentProps) {
  return (
    <I18nProvider>
      <ErrorContent {...props} />
    </I18nProvider>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DYNAMO VIETNAM QT - MES" },
      {
        name: "description",
        content:
          "Hệ thống điều hành nhà thầu phụ, nhiệt luyện và luân chuyển QT cho phân xưởng PIN, INSERT, MOLD.",
      },
      { name: "author", content: "DYNAMO VIETNAM" },
      { property: "og:title", content: "DYNAMO VIETNAM QT - MES" },
      {
        property: "og:description",
        content: "Quản lý nhà thầu phụ, nhiệt luyện và luân chuyển QT.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Noto+Sans+JP:wght@400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const bare = pathname === "/login";

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <I18nProvider>
        <DynamoShell bare={bare}>
          <Outlet />
        </DynamoShell>
      </I18nProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
