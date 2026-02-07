import { readFile } from "node:fs/promises";
import { createSign } from "node:crypto";

const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

type ServiceAccountConfig = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;
let cachedConfig: ServiceAccountConfig | null = null;

async function loadServiceAccountConfig(): Promise<ServiceAccountConfig> {
  if (cachedConfig) return cachedConfig;

  const jsonEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH;

  let raw: string | null = null;
  if (jsonEnv && jsonEnv.trim().length > 0) {
    raw = jsonEnv;
  } else if (jsonPath && jsonPath.trim().length > 0) {
    raw = await readFile(jsonPath, "utf8");
  }

  if (!raw) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_JSON_PATH");
  }

  let parsed: ServiceAccountConfig;
  try {
    parsed = JSON.parse(raw) as ServiceAccountConfig;
  } catch {
    throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON format");
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Service account JSON missing client_email or private_key");
  }

  cachedConfig = parsed;
  return parsed;
}

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createJwtAssertion(config: ServiceAccountConfig) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: config.client_email,
    scope: DRIVE_SCOPES.join(" "),
    aud: config.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(data);
  const signature = signer.sign(config.private_key, "base64");
  const encodedSignature = signature.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${data}.${encodedSignature}`;
}

async function fetchServiceAccountToken(): Promise<{ access_token: string; expires_in: number }> {
  const config = await loadServiceAccountConfig();
  const assertion = createJwtAssertion(config);

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const response = await fetch(config.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Failed to fetch service account token");
  }

  return data as { access_token: string; expires_in: number };
}

export async function getDriveAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - Date.now() > 60 * 1000) {
    return cachedToken.accessToken;
  }

  const data = await fetchServiceAccountToken();
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.accessToken;
}

export async function getDriveConnectionStatus() {
  try {
    await loadServiceAccountConfig();
    return { connected: true } as const;
  } catch (error) {
    return { connected: false, error: (error as Error).message } as const;
  }
}

export function buildDriveViewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
