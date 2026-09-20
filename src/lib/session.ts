/**
 * Session tokens — Edge-safe.
 *
 * Deliberately free of node: imports and DB access so `middleware.ts`
 * (Edge runtime) can verify a session. Web Crypto HMAC works in both the
 * Edge and Node runtimes.
 *
 * The token is signed, not encrypted: it carries no secret, and the
 * signature is what makes it unforgeable. Role is embedded so middleware
 * can gate without a database round trip — but every admin route ALSO
 * re-checks the role against the database, so a stale token cannot
 * out-live a revoked admin.
 */

export const SESSION_COOKIE = "arena_session";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

export interface SessionPayload {
  uid: string;
  role: "admin" | "customer";
  email: string;
  exp: number; // unix seconds
}

function b64urlEncode(bytes: Uint8Array<ArrayBuffer>): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret) as Uint8Array<ArrayBuffer>,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function secretOrThrow(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s === "replace_me") {
    throw new Error("SESSION_SECRET is not set — refusing to issue sessions.");
  }
  return s;
}

export async function signSession(
  payload: Omit<SessionPayload, "exp">,
  maxAgeSeconds = SESSION_MAX_AGE,
): Promise<string> {
  const body: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const data = new TextEncoder().encode(JSON.stringify(body)) as Uint8Array<ArrayBuffer>;
  const sig = await crypto.subtle.sign("HMAC", await key(secretOrThrow()), data);
  return `${b64urlEncode(data)}.${b64urlEncode(new Uint8Array(sig) as Uint8Array<ArrayBuffer>)}`;
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [dataPart, sigPart] = token.split(".");
  if (!dataPart || !sigPart) return null;

  try {
    const data = b64urlDecode(dataPart);
    const sig = b64urlDecode(sigPart);
    // verify() is constant-time; never compare signatures by hand.
    const ok = await crypto.subtle.verify(
      "HMAC",
      await key(secretOrThrow()),
      sig,
      data,
    );
    if (!ok) return null;

    const payload = JSON.parse(new TextDecoder().decode(data)) as SessionPayload;
    if (!payload?.uid || !payload?.role) return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
