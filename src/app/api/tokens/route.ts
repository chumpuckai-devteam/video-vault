import { NextRequest, NextResponse } from "next/server";
import { createVideoToken } from "../../../lib/firestore";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const videoId = String(body?.videoId ?? "");

  if (!videoId) {
    return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
  }

  const token = crypto.randomUUID();
  const expiresAtRaw = body?.expiresAt ? String(body.expiresAt) : null;
  const maxSessionsRaw = body?.maxSessions ?? null;

  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "Invalid expiresAt" }, { status: 400 });
  }

  const maxSessions = maxSessionsRaw !== null ? Number(maxSessionsRaw) : null;
  if (maxSessions !== null && (!Number.isFinite(maxSessions) || maxSessions < 1)) {
    return NextResponse.json({ error: "Invalid maxSessions" }, { status: 400 });
  }

  try {
    await createVideoToken({
      token,
      video_id: videoId,
      expires_at: expiresAt,
      max_sessions: maxSessions ?? undefined,
    });
  } catch (error) {
    console.error("Firestore token insert error", error);
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }

  return NextResponse.json({ token });
}
