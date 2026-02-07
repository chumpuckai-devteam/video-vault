import { NextResponse } from "next/server";
import { revokeVideoToken } from "../../../../../lib/firestore";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    await revokeVideoToken(token);
  } catch (error) {
    console.error("Failed to revoke token", error);
    return NextResponse.json({ error: "Failed to revoke token" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
