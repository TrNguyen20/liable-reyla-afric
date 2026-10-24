import { createServerFn } from '@tanstack/react-start';
import { fetchSheetItems } from '@/lib/dynamo-source';
import { scopeItemsForRole } from '@/lib/data-scope';

/** Reads the sheet on the server and returns only the rows/fields the session role may see. */
export const fetchScopedSheet = createServerFn({ method: 'POST' })
  .validator((data: { url: string }) => data)
  .handler(async ({ data }) => {
    let role = 'viewer';
    try {
      const { readSession } = await import('./session.server');
      const s = await readSession();
      if (s?.role) role = s.role;
    } catch {
      role = 'viewer';
    }
    const r = await fetchSheetItems(data.url);
    const items = scopeItemsForRole(r.items, role);
    return { ...r, items };
  });
