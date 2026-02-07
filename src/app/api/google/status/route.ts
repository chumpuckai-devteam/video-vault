import { NextResponse } from "next/server";
import { getStoredDriveToken } from "../../../../lib/googleDrive";

export const runtime = "nodejs";

export async function GET() {
  const stored = await getStoredDriveToken();
  const connected = Boolean(stored?.refresh_token);

  return NextResponse.json({
    connected,
    expiresAt: stored?.expires_at ?? null,
  });
}
