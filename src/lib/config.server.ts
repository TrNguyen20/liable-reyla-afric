/**
 * Server-only configuration store for central Webhook and system integrations.
 * Persists the Webhook URL across sessions so that any authenticated role
 * (Admin, Leader, Vendor, Viewer) can trigger write-backs to Google Sheets
 * without requiring client-side configuration.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

type ServerConfig = {
  webhookUrl?: string;
  updatedAt?: string;
  updatedBy?: string;
};

const CONFIG_PATH = resolve(process.cwd(), '.server-config.json');

// In-memory cache for ultra-fast access
let cachedConfig: ServerConfig | null = null;

function loadFromDisk(): ServerConfig {
  if (cachedConfig) return cachedConfig;
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      cachedConfig = JSON.parse(raw) as ServerConfig;
      return cachedConfig;
    }
  } catch (err) {
    console.warn('[config.server] Failed to read .server-config.json:', err);
  }
  cachedConfig = { webhookUrl: process.env.DYNAMO_WEBHOOK_URL || '' };
  return cachedConfig;
}

function saveToDisk(config: ServerConfig): void {
  cachedConfig = config;
  try {
    const dir = dirname(CONFIG_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[config.server] Best-effort disk write failed (in-memory preserved):', err);
  }
}

/**
 * Retrieve the active central Webhook URL stored on the server.
 */
export async function getCentralWebhookUrl(): Promise<string> {
  const config = loadFromDisk();
  return config.webhookUrl || process.env.DYNAMO_WEBHOOK_URL || '';
}

/**
 * Update the central Webhook URL on the server (restricted to Admin role).
 */
export async function saveCentralWebhookUrl(url: string, user = 'admin'): Promise<void> {
  const clean = (url || '').trim();
  const config = loadFromDisk();
  config.webhookUrl = clean;
  config.updatedAt = new Date().toISOString();
  config.updatedBy = user;
  saveToDisk(config);
}
