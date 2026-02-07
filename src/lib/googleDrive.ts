import { supabaseServer } from "./supabaseServer";

const TOKEN_ROW_ID = "admin";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export type DriveTokenRow = {
  id: string;
  refresh_token: string;
  access_token: string | null;
  expires_at: string | null;
};

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI");
  }

  return { clientId, clientSecret, redirectUri, baseUrl };
}

export async function getStoredDriveToken(): Promise<DriveTokenRow | null> {
  const { data, error } = await supabaseServer
    .from("google_drive_tokens")
    .select("id,refresh_token,access_token,expires_at")
    .eq("id", TOKEN_ROW_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function upsertDriveToken(input: {
  refreshToken?: string | null;
  accessToken?: string | null;
  expiresAt?: Date | null;
}) {
  const existing = await getStoredDriveToken();
  const refreshToken = input.refreshToken ?? existing?.refresh_token ?? null;

  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const payload = {
    id: TOKEN_ROW_ID,
    refresh_token: refreshToken,
    access_token: input.accessToken ?? existing?.access_token ?? null,
    expires_at: input.expiresAt ? input.expiresAt.toISOString() : existing?.expires_at ?? null,
  };

  const { error } = await supabaseServer.from("google_drive_tokens").upsert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function refreshDriveAccessToken(refreshToken: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    redirect_uri: redirectUri,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Failed to refresh access token");
  }

  const expiresAt = new Date(Date.now() + Number(data.expires_in) * 1000);

  await upsertDriveToken({
    refreshToken,
    accessToken: data.access_token,
    expiresAt,
  });

  return data.access_token as string;
}

export async function getDriveAccessToken(): Promise<string> {
  const stored = await getStoredDriveToken();
  if (!stored) {
    throw new Error("Google Drive is not connected");
  }

  const expiresAt = stored.expires_at ? new Date(stored.expires_at) : null;
  const isExpired = !expiresAt || expiresAt.getTime() - Date.now() < 60 * 1000;

  if (!stored.access_token || isExpired) {
    return refreshDriveAccessToken(stored.refresh_token);
  }

  return stored.access_token;
}

export function buildDriveViewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
