import { NextResponse } from "next/server";
import { resetVideoTokenSession } from "../../../../../lib/firestore";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    await resetVideoTokenSession(token);
  } catch (error) {
    console.error("Failed to reset session", error);
    return NextResponse.json({ error: "Failed to reset session" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
