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
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="mes-card max-w-md p-8 text-center shadow-lg">
        <span className="font-mono text-5xl font-black tracking-tight text-primary">404</span>
        <h2 className="mt-3 font-display text-xl font-bold text-foreground">Không tìm thấy tài nguyên</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Đường dẫn yêu cầu không tồn tại trong hệ thống điều hành luân chuyển QT hoặc đã được di dời sang địa chỉ khác.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-sm bg-primary px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
          >
            Quay về Bàn điều hành
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="mes-card max-w-md border-l-4 border-l-destructive p-8 text-center shadow-lg">
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-destructive">
          SỰ CỐ VẬN HÀNH / RUNTIME EXCEPTION
        </span>
        <h2 className="mt-2 font-display text-xl font-bold text-foreground">
          Không thể tải trang dữ liệu
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Đã xảy ra lỗi trong quá trình khởi tạo hoặc xử lý luồng dữ liệu trên trình duyệt. Bạn có thể thử tải lại trang hoặc quay về trang chủ.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Thử tải lại
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-sm border border-input bg-card px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-muted"
          >
            Về Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DYNAMO VIETNAM QT - MES" },
      { name: "description", content: "Hệ thống điều hành nhà thầu phụ, nhiệt luyện và luân chuyển QT cho phân xưởng PIN, INSERT, MOLD." },
      { name: "author", content: "DYNAMO VIETNAM" },
      { property: "og:title", content: "DYNAMO VIETNAM QT - MES" },
      { property: "og:description", content: "Quản lý nhà thầu phụ, nhiệt luyện và luân chuyển QT." },
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
        href: "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap",
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
      <DynamoShell bare={bare}><Outlet /></DynamoShell>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
