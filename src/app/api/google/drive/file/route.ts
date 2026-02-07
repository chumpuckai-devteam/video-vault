import { NextRequest, NextResponse } from "next/server";
import { getDriveAccessToken } from "../../../../../lib/googleDrive";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get("fileId");
  if (!fileId) {
    return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
  }

  const accessToken = await getDriveAccessToken();

  const params = new URLSearchParams({
    fields: "id,name,mimeType,size,webViewLink",
    supportsAllDrives: "true",
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json({ error: data.error?.message || "Unable to load file." }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    mimeType: data.mimeType,
    size: data.size,
    webViewLink: data.webViewLink,
  });
}
