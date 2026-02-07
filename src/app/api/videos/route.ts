import { NextRequest, NextResponse } from "next/server";
import { extractDriveFileId } from "../../../lib/drive";
import { buildDriveViewUrl } from "../../../lib/googleDrive";
import { createVideo, listVideos, listVideoTokensByVideoId } from "../../../lib/firestore";

export async function GET() {
  try {
    const videos = await listVideos();
    const tokens = await Promise.all(
      videos.map((video) => listVideoTokensByVideoId(video.id))
    );
    const videoRows = videos.map((video, index) => ({
      ...video,
      tokens: tokens[index] ?? [],
    }));

    return NextResponse.json({ videos: videoRows });
  } catch (error) {
    console.error("Firestore fetch error", error);
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
  }
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

  try {
    const video = await createVideo({
      title,
      drive_file_id: fileId,
      drive_url: driveUrl,
    });

    return NextResponse.json({ video });
  } catch (error) {
    console.error("Firestore insert error", error);
    return NextResponse.json({ error: "Failed to add video" }, { status: 500 });
  }
}
