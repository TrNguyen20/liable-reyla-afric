/**
 * Server-Side Realtime Live Store for DYNAMO MES.
 * Maintains an in-memory dataset, version counter, and delta changelog,
 * combined with Google Apps Script Realtime Gateway as a centralized hub
 * to guarantee sub-second bidirectional synchronization across all
 * connected client desktops on both Local Node.js and Vercel Serverless runtimes.
 */

import type { QTItem } from '@/lib/dynamo-data';
import { fetchSheetItems } from '@/lib/dynamo-source';
import { LIVE_SHEET_URL } from '@/lib/live-sheet';
import { getCentralWebhookUrl } from '@/lib/config.server';

export type DeltaRecord = {
  id: string;
  patch: Partial<QTItem>;
  version: number;
  timestamp: string;
  user?: string;
};

type ServerLiveStore = {
  items: QTItem[];
  version: number;
  lastModified: string;
  lastGooglePull: string;
  changelog: DeltaRecord[];
  isPulling: boolean;
  lastRemoteCheck: number;
};

// Use globalThis to persist store across development HMR reloads
const g = globalThis as { __dynamoServerLiveStore?: ServerLiveStore };
const store: ServerLiveStore = (g.__dynamoServerLiveStore ??= {
  items: [],
  version: 1,
  lastModified: new Date().toISOString(),
  lastGooglePull: '',
  changelog: [],
  isPulling: false,
  lastRemoteCheck: 0,
});

/**
 * Retrieve the current in-memory dataset from server.
 * Seeds from Google Sheets on initial boot or if forceGoogle is requested.
 */
export async function getLiveServerDataset(forceGoogle = false): Promise<{
  items: QTItem[];
  version: number;
  lastModified: string;
  total: number;
}> {
  if (store.items.length === 0 || forceGoogle) {
    if (!store.isPulling) {
      store.isPulling = true;
      try {
        const res = await fetchSheetItems(LIVE_SHEET_URL);
        if (res.items && res.items.length > 0) {
          // If we already had modified items, preserve recent local patches
          if (store.changelog.length > 0 && store.items.length > 0) {
            const patchMap = new Map<string, Partial<QTItem>>();
            for (const delta of store.changelog) {
              const prev = patchMap.get(delta.id) || {};
              patchMap.set(delta.id, { ...prev, ...delta.patch });
            }
            store.items = res.items.map((item) => {
              const patch = patchMap.get(item.ID_Key);
              return patch ? { ...item, ...patch } : item;
            });
          } else {
            store.items = res.items;
          }
          store.version += 1;
          store.lastGooglePull = new Date().toISOString();
          store.lastModified = new Date().toISOString();
        }
      } catch (err) {
        console.warn('[server-dataset] Error seeding from Google Sheets:', err);
        if (store.items.length === 0) {
          throw err;
        }
      } finally {
        store.isPulling = false;
      }
    }
  }

  return {
    items: store.items,
    version: store.version,
    lastModified: store.lastModified,
    total: store.items.length,
  };
}

/**
 * Update server store version from remote authoritative hub
 */
export function setServerDatasetVersion(newVersion: number, delta?: DeltaRecord): void {
  if (newVersion > store.version) {
    store.version = newVersion;
    store.lastModified = new Date().toISOString();
  }
  if (delta && !store.changelog.some((d) => d.version === delta.version && d.id === delta.id)) {
    store.changelog.push(delta);
    if (store.changelog.length > 500) {
      store.changelog.splice(0, store.changelog.length - 500);
    }
  }
}

/**
 * Query remote Google Apps Script hub for the authoritative global version.
 * Throttled to max 1 request per 1500ms to avoid overwhelming Apps Script.
 */
async function syncRemoteVersion(): Promise<number> {
  const now = Date.now();
  if (now - store.lastRemoteCheck < 1500) {
    return store.version;
  }
  store.lastRemoteCheck = now;

  try {
    const webhookUrl = await getCentralWebhookUrl();
    if (!webhookUrl) return store.version;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${webhookUrl}?action=checkVersion`, {
      method: 'GET',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (res.ok) {
      const data = await res.json() as { ok?: boolean; version?: number };
      if (data && typeof data.version === 'number' && data.version > store.version) {
        store.version = data.version;
        store.lastModified = new Date().toISOString();
      }
    }
  } catch {
    // Network / timeout: fallback to local memory gracefully
  }

  return store.version;
}

/**
 * Fetch missing deltas from Google Apps Script hub when serverless container has cold-started.
 */
async function fetchRemoteDeltas(sinceVersion: number): Promise<DeltaRecord[]> {
  try {
    const webhookUrl = await getCentralWebhookUrl();
    if (!webhookUrl) return [];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${webhookUrl}?action=getDeltas&since=${sinceVersion}`, {
      method: 'GET',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (res.ok) {
      const data = await res.json() as { ok?: boolean; deltas?: DeltaRecord[]; version?: number };
      if (data && Array.isArray(data.deltas)) {
        if (data.version && data.version > store.version) {
          store.version = data.version;
        }
        for (const d of data.deltas) {
          if (!store.changelog.some((c) => c.version === d.version && c.id === d.id)) {
            store.changelog.push(d);
          }
        }
        return data.deltas;
      }
    }
  } catch {
    // Fallback
  }
  return [];
}

/**
 * Immediately patch an item in server memory.
 * Increments the version counter and records the delta so other desktops get it in < 1s.
 */
export function patchServerDataset(
  idKey: string,
  patch: Partial<QTItem>,
  user?: string,
): { ok: boolean; version: number } {
  if (!idKey || !patch || Object.keys(patch).length === 0) {
    return { ok: false, version: store.version };
  }

  const idx = store.items.findIndex((i) => i.ID_Key === idKey);
  if (idx !== -1) {
    store.items[idx] = { ...store.items[idx], ...patch };
  } else {
    console.warn(`[server-dataset] Item with ID_Key "${idKey}" not yet in server cache.`);
  }

  store.version += 1;
  store.lastModified = new Date().toISOString();

  store.changelog.push({
    id: idKey,
    patch,
    version: store.version,
    timestamp: store.lastModified,
    user,
  });

  // Limit changelog memory size to recent 500 changes
  if (store.changelog.length > 500) {
    store.changelog.splice(0, store.changelog.length - 500);
  }

  return { ok: true, version: store.version };
}

/**
 * Lightweight version check for polling (payload ~50 bytes).
 * Syncs with Google Apps Script hub if running in serverless container.
 */
export async function getServerDatasetVersionAsync(): Promise<{
  version: number;
  lastModified: string;
  count: number;
}> {
  await syncRemoteVersion();
  return {
    version: store.version,
    lastModified: store.lastModified,
    count: store.items.length,
  };
}

/**
 * Synchronous version check for instant local reads
 */
export function getServerDatasetVersion(): {
  version: number;
  lastModified: string;
  count: number;
} {
  return {
    version: store.version,
    lastModified: store.lastModified,
    count: store.items.length,
  };
}

/**
 * Returns delta changes that occurred after a given version.
 * If serverless container is fresh and missing local deltas, fetches them from Google Apps Script hub.
 */
export async function getDeltasSinceAsync(sinceVersion: number): Promise<{
  resetRequired: boolean;
  version: number;
  deltas: DeltaRecord[];
}> {
  if (sinceVersion <= 0 || store.version - sinceVersion > 400) {
    return {
      resetRequired: true,
      version: store.version,
      deltas: [],
    };
  }

  let deltas = store.changelog.filter((d) => d.version > sinceVersion);

  // If local container is missing deltas (e.g. freshly cold-started container on Vercel),
  // pull deltas from centralized Apps Script hub
  if (deltas.length === 0 && store.version > sinceVersion) {
    const remoteDeltas = await fetchRemoteDeltas(sinceVersion);
    if (remoteDeltas.length > 0) {
      deltas = remoteDeltas;
    }
  }

  return {
    resetRequired: false,
    version: store.version,
    deltas,
  };
}

/**
 * Synchronous getDeltasSince for local unit tests and memory access
 */
export function getDeltasSince(sinceVersion: number): {
  resetRequired: boolean;
  version: number;
  deltas: DeltaRecord[];
} {
  if (sinceVersion <= 0 || store.version - sinceVersion > 400) {
    return {
      resetRequired: true,
      version: store.version,
      deltas: [],
    };
  }

  const deltas = store.changelog.filter((d) => d.version > sinceVersion);
  return {
    resetRequired: false,
    version: store.version,
    deltas,
  };
}
