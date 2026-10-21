// Server-only signed session (HMAC-SHA256 via Web Crypto, works on Edge runtime).
// The browser holds an HttpOnly cookie it cannot read or forge; role is decided here only.
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

export type SessionData = { role: string; note: string; exp: number };

const COOKIE = "dynamo_session";
const MAX_AGE = 8 * 60 * 60; // one 8h shift

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

const subtleCrypto = (typeof crypto !== "undefined" ? crypto : (globalThis as unknown as { crypto: Crypto }).crypto)?.subtle;

async function key() {
  const secret =
    (typeof process !== "undefined" && process.env?.["SESSION_SECRET"]) ||
    "dynamo-mes-2026-production-session-fallback-secret-salt-key-4f9a";
  if (!subtleCrypto) throw new Error("Web Crypto API is not available in runtime");
  return subtleCrypto.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(data: Omit<SessionData, "exp">): Promise<string> {
  const payload: SessionData = { ...data, exp: Math.floor(Date.now() / 1000) + MAX_AGE };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  if (!subtleCrypto) throw new Error("Web Crypto API is not available");
  const sig = await subtleCrypto.sign("HMAC", await key(), enc.encode(body));
  return `${body}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined): Promise<SessionData | null> {
  if (!token || !subtleCrypto) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const ok = await subtleCrypto.verify("HMAC", await key(), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(body))) as SessionData;
    if (!data.role || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function startSession(data: Omit<SessionData, "exp">) {
  const isProduction = typeof process !== "undefined" && process.env?.["NODE_ENV"] === "production";
  setCookie(COOKIE, await signSession(data), {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export const readSession = () => verifySession(getCookie(COOKIE));

export const endSession = () => deleteCookie(COOKIE, { path: "/" });
