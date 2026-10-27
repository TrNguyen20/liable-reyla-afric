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

// Default fallback Webhook URL deployed for this DYNAMO MES project.
// Ensures that on serverless runtimes (like Vercel Lambda) where disk files
// are not bundled into the serverless function, write-backs never fail with empty URL.
export const DEFAULT_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbxaZOFq1sMm7vLSLmeYJvu1To4SXdbtERiMlvZE9jYhv7LCPA0SI9cHvqQ_21m0-RA/exec';

const CONFIG_PATH = resolve(process.cwd(), '.server-config.json');

// In-memory cache for ultra-fast access
let cachedConfig: ServerConfig | null = null;

export function _resetCachedConfigForTesting(): void {
  cachedConfig = null;
}

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
  cachedConfig = { webhookUrl: process.env.DYNAMO_WEBHOOK_URL || DEFAULT_WEBHOOK_URL };
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
 * Precedence: Environment Variable > Saved Disk/Memory Config > Default Webhook URL.
 */
export async function getCentralWebhookUrl(): Promise<string> {
  const envUrl = process.env.DYNAMO_WEBHOOK_URL?.trim();
  if (envUrl) return envUrl;

  const config = loadFromDisk();
  if (typeof config.webhookUrl === 'string') {
    return config.webhookUrl;
  }
  return DEFAULT_WEBHOOK_URL;
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
