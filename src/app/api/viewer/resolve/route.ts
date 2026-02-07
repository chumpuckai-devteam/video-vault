import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "../../../../lib/supabaseServer";

function getSessionId() {
  const cookieStore = cookies();
  return cookieStore.get("vv_session")?.value ?? null;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const { data: tokenRow, error: tokenError } = await supabaseServer
    .from("video_tokens")
    .select("token,video_id,session_id")
    .eq("token", token)
    .single();

  if (tokenError || !tokenRow) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 404 });
  }

  let sessionId = getSessionId();
  let response: NextResponse;

  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }

  if (tokenRow.session_id && tokenRow.session_id !== sessionId) {
    return NextResponse.json({ error: "This link is locked to another session." }, { status: 403 });
  }

  if (!tokenRow.session_id) {
    const { error: lockError } = await supabaseServer
      .from("video_tokens")
      .update({ session_id: sessionId })
      .eq("token", token)
      .is("session_id", null);

    if (lockError) {
      return NextResponse.json({ error: "Unable to lock session." }, { status: 500 });
    }
  }

  const { data: video, error: videoError } = await supabaseServer
    .from("videos")
    .select("id,title,drive_file_id")
    .eq("id", tokenRow.video_id)
    .single();

  if (videoError || !video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  response = NextResponse.json({
    video: {
      id: video.id,
      title: video.title,
      driveFileId: video.drive_file_id,
    },
  });

  if (!getSessionId()) {
    response.cookies.set({
      name: "vv_session",
      value: sessionId,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}

