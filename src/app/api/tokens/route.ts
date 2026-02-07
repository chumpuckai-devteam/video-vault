import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const videoId = String(body?.videoId ?? "");

  if (!videoId) {
    return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
  }

  const token = crypto.randomUUID();
  const { data, error } = await supabaseServer
    .from("video_tokens")
    .insert({ token, video_id: videoId })
    .select("token,video_id,session_id,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ token: data?.token });
}
