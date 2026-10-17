import { createServerFn } from '@tanstack/react-start';
import { fetchSheetItems } from '@/lib/dynamo-source';
import { scopeItemsForRole } from '@/lib/data-scope';

/** Reads the sheet on the server and returns only the rows/fields the session role may see. */
export const fetchScopedSheet = createServerFn({ method: 'POST' })
  .inputValidator((data: { url: string }) => data)
  .handler(async ({ data }) => {
    const { readSession } = await import('./session.server');
    const s = await readSession();
    if (!s) throw new Error('Phiên đăng nhập đã hết hạn');
    const r = await fetchSheetItems(data.url);
    const items = scopeItemsForRole(r.items, s.role);
    return { ...r, items };
  });
