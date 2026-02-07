import { NextResponse } from "next/server";
import { getDriveConnectionStatus } from "../../../../lib/googleDrive";

export const runtime = "nodejs";

export async function GET() {
  const status = await getDriveConnectionStatus();

  return NextResponse.json({
    connected: status.connected,
    error: status.connected ? null : status.error,
  });
}
