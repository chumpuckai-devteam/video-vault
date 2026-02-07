import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";
import { extractDriveFileId } from "../../../lib/drive";
import { buildDriveViewUrl } from "../../../lib/googleDrive";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("videos")
    .select("id,title,drive_file_id,drive_url,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ videos: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const title = body?.title ? String(body.title) : null;

  let fileId: string | null = null;
  let driveUrl = "";

  if (body?.driveFileId) {
    fileId = String(body.driveFileId);
    driveUrl = body?.driveUrl ? String(body.driveUrl) : buildDriveViewUrl(fileId);
  } else {
    driveUrl = String(body?.driveUrl ?? "");
    fileId = extractDriveFileId(driveUrl);
  }

  if (!fileId) {
    return NextResponse.json({ error: "Invalid Google Drive link." }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("videos")
    .insert({
      title,
      drive_file_id: fileId,
      drive_url: driveUrl,
    })
    .select("id,title,drive_file_id,drive_url,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ video: data });
}
