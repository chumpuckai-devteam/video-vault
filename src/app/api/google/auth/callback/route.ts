import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthConfig, upsertDriveToken } from "../../../../../lib/googleDrive";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`/admin?drive=error&reason=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`/admin?drive=error&reason=missing_code`);
  }

  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await tokenResponse.json();

  if (!tokenResponse.ok) {
    return NextResponse.redirect(`/admin?drive=error&reason=${encodeURIComponent(data.error || "token_exchange_failed")}`);
  }

  const refreshToken = data.refresh_token as string | undefined;
  const accessToken = data.access_token as string | undefined;
  const expiresIn = Number(data.expires_in || 0);
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

  await upsertDriveToken({
    refreshToken,
    accessToken,
    expiresAt,
  });

  return NextResponse.redirect("/admin?drive=connected");
}
