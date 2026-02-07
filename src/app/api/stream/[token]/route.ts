import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getVideoById, getVideoToken } from "../../../../lib/firestore";
import { getDriveAccessToken } from "../../../../lib/googleDrive";

export const runtime = "nodejs";

function isExpired(expiresAtIso: string | null | undefined) {
  if (!expiresAtIso) return false;
  return new Date(expiresAtIso).getTime() <= Date.now();
}

async function resolveToken(token: string) {
  const tokenRow = await getVideoToken(token);
  if (!tokenRow || tokenRow.revoked_at) {
    return { error: "Invalid or expired link." } as const;
  }

  if (isExpired(tokenRow.expires_at)) {
    return { error: "Link expired." } as const;
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("vv_session")?.value;
  if (!sessionId || tokenRow.session_id !== sessionId) {
    return { error: "Session mismatch." } as const;
  }

  const video = await getVideoById(tokenRow.video_id);
  if (!video) {
    return { error: "Video not found." } as const;
  }

  return { driveFileId: video.drive_file_id } as const;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const resolved = await resolveToken(token);

  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 403 });
  }

  const range = request.headers.get("range") ?? undefined;
  const accessToken = await getDriveAccessToken();

  const url = `https://www.googleapis.com/drive/v3/files/${resolved.driveFileId}?alt=media&supportsAllDrives=true`;

  const driveResponse = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(range ? { Range: range } : {}),
    },
  });

  const headers = new Headers();
  const passthroughHeaders = [
    "content-type",
    "content-length",
    "accept-ranges",
    "content-range",
  ];

  passthroughHeaders.forEach((header) => {
    const value = driveResponse.headers.get(header);
    if (value) headers.set(header, value);
  });

  return new NextResponse(driveResponse.body, {
    status: driveResponse.status,
    headers,
  });
}
