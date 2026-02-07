const ADMIN_COOKIE_NAME = "vv_admin";

function base64UrlEncode(buffer: ArrayBuffer): string {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlEncodeString(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const withPadding = padded + "=".repeat(padLength);
  return Buffer.from(withPadding, "base64").toString("utf8");
}

async function signValue(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64UrlEncode(signature);
}

async function verifyValue(value: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    Buffer.from(signature.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
    encoder.encode(value)
  );
}

export async function createAdminToken(secret: string): Promise<string> {
  const payload = {
    iat: Date.now(),
  };
  const payloadEncoded = base64UrlEncodeString(JSON.stringify(payload));
  const signature = await signValue(payloadEncoded, secret);
  return `${payloadEncoded}.${signature}`;
}

export async function verifyAdminToken(token: string, secret: string): Promise<boolean> {
  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) return false;
  const valid = await verifyValue(payloadEncoded, signature, secret);
  if (!valid) return false;
  try {
    const payload = JSON.parse(base64UrlDecode(payloadEncoded)) as { iat?: number };
    return Boolean(payload?.iat);
  } catch {
    return false;
  }
}

export function getAdminCookieName() {
  return ADMIN_COOKIE_NAME;
}
