import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

describe("App routing", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  it("matches a page for / instead of falling back to not found", () => {
    const matches = router.matchRoutes("/");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches all 4 active operational routes", () => {
    const trackingMatches = router.matchRoutes("/tracking");
    expect(trackingMatches.at(-1)?.routeId).toBe("/tracking");

    const dashboardMatches = router.matchRoutes("/dashboard");
    expect(dashboardMatches.at(-1)?.routeId).toBe("/dashboard");

    const ordersMatches = router.matchRoutes("/orders");
    expect(ordersMatches.at(-1)?.routeId).toBe("/orders");

    const syncMatches = router.matchRoutes("/sync");
    expect(syncMatches.at(-1)?.routeId).toBe("/sync");
  });

  it("matches standalone /login route", () => {
    const loginMatches = router.matchRoutes("/login");
    expect(loginMatches.at(-1)?.routeId).toBe("/login");
  });
});
