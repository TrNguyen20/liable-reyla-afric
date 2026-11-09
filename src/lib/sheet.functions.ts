import { createServerFn } from '@tanstack/react-start';
import { scopeItemsForRole } from '@/lib/data-scope';
import type { QTItem } from '@/lib/dynamo-data';

export interface ScopedSheetResult {
  items: QTItem[];
  total: number;
  version: number;
  lastModified: string;
  skipped: number;
  duplicates: string[];
  unknownStatus: string[];
  estimatedDue: number;
  badDates: number;
}

/** Reads the live dataset on the server (seeded from Google Sheets) and returns role-scoped rows. */
export const fetchScopedSheet = createServerFn({ method: 'POST' })
  .validator((data: { url?: string; forceGoogle?: boolean }) => data)
  .handler(async ({ data }): Promise<Response> => {
    let role = 'viewer';
    try {
      const { readSession } = await import('./session.server');
      const s = await readSession();
      if (s?.role) role = s.role;
    } catch {
      role = 'viewer';
    }
    const { getLiveServerDataset } = await import('./server-dataset');
    const r = await getLiveServerDataset(Boolean(data?.forceGoogle));
    const items = scopeItemsForRole(r.items, role);
    const payload: ScopedSheetResult = {
      items,
      total: r.total,
      version: r.version,
      lastModified: r.lastModified,
      skipped: 0,
      duplicates: [],
      unknownStatus: [],
      estimatedDue: 0,
      badDates: 0,
    };
    // Returning standard Response bypasses Seroval 16MB buffer limit and enables streaming / compression
    return new Response(JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });
