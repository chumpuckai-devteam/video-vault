import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    { error: "OAuth flow removed. Configure a Google service account instead." },
    { status: 410 }
  );
}
