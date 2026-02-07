import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthConfig, upsertDriveToken } from "../../../../../lib/googleDrive";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { clientId, clientSecret, redirectUri, baseUrl } = getGoogleOAuthConfig();
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    const errorUrl = new URL("/admin", baseUrl || request.nextUrl.origin);
    errorUrl.searchParams.set("drive", "error");
    errorUrl.searchParams.set("reason", error);
    return NextResponse.redirect(errorUrl);
  }

  if (!code) {
    const errorUrl = new URL("/admin", baseUrl || request.nextUrl.origin);
    errorUrl.searchParams.set("drive", "error");
    errorUrl.searchParams.set("reason", "missing_code");
    return NextResponse.redirect(errorUrl);
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  let tokenResponse: Response;
  let data: any;
  try {
    tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });

    data = await tokenResponse.json();
  } catch (err) {
    const errAny = err as any;
    console.error("Google token exchange failed", {
      message: errAny?.message,
      name: errAny?.name,
      code: errAny?.code,
      cause: errAny?.cause,
    });
    console.error("Token exchange config", {
      clientId: clientId?.slice(0, 12) + "…",
      redirectUri,
    });
    const errorUrl = new URL("/admin", baseUrl || request.nextUrl.origin);
    const reason = errAny?.cause?.code || errAny?.code || errAny?.message || "token_fetch_failed";
    errorUrl.searchParams.set("drive", "error");
    errorUrl.searchParams.set("reason", `token_fetch_failed:${reason}`);
    return NextResponse.redirect(errorUrl);
  }

  if (!tokenResponse.ok) {
    console.error("Google token exchange error", data);
    const errorUrl = new URL("/admin", baseUrl || request.nextUrl.origin);
    errorUrl.searchParams.set("drive", "error");
    errorUrl.searchParams.set("reason", data.error || "token_exchange_failed");
    return NextResponse.redirect(errorUrl);
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

  const successUrl = new URL("/admin", baseUrl || request.nextUrl.origin);
  successUrl.searchParams.set("drive", "connected");
  return NextResponse.redirect(successUrl);
}
