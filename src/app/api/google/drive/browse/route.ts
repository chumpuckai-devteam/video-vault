import { NextRequest, NextResponse } from "next/server";
import { getDriveAccessToken } from "../../../../../lib/googleDrive";

export const runtime = "nodejs";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
};

export async function GET(request: NextRequest) {
  const folderId = request.nextUrl.searchParams.get("folderId") ?? "root";
  const accessToken = await getDriveAccessToken();

  const queryParts = [
    `'${folderId}' in parents`,
    "trashed = false",
  ];

  const q = queryParts.join(" and ");

  const params = new URLSearchParams({
    q,
    pageSize: "100",
    fields: "files(id,name,mimeType,size,modifiedTime)",
    orderBy: "folder,name",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json({ error: data.error?.message || "Unable to load Drive." }, { status: 500 });
  }

  const files = (data.files as DriveFile[]) ?? [];
  const folders = files.filter((file) => file.mimeType === "application/vnd.google-apps.folder");
  const videos = files.filter((file) => file.mimeType?.startsWith("video/"));

  return NextResponse.json({
    folderId,
    folders,
    videos,
  });
}
