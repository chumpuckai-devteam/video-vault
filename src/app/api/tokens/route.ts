import { NextRequest, NextResponse } from "next/server";
import { createVideoToken } from "../../../lib/firestore";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const videoId = String(body?.videoId ?? "");

  if (!videoId) {
    return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
  }

  const token = crypto.randomUUID();

  try {
    await createVideoToken({ token, video_id: videoId });
  } catch (error) {
    console.error("Firestore token insert error", error);
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }

  return NextResponse.json({ token });
}
