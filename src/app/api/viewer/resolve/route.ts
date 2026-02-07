import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getVideoById, getVideoToken, lockVideoTokenSession } from "../../../../lib/firestore";

async function getSessionId() {
  const cookieStore = await cookies();
  return cookieStore.get("vv_session")?.value ?? null;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const tokenRow = await getVideoToken(token);
  if (!tokenRow) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 404 });
  }

  let sessionId = await getSessionId();

  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }

  const locked = await lockVideoTokenSession(token, sessionId);
  if (!locked) {
    return NextResponse.json({ error: "This link is locked to another session." }, { status: 403 });
  }

  const video = await getVideoById(tokenRow.video_id);
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const response = NextResponse.json({
    video: {
      id: video.id,
      title: video.title,
      driveFileId: video.drive_file_id,
    },
  });

  if (!(await getSessionId())) {
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
