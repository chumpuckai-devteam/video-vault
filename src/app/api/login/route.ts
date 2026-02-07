import { NextRequest, NextResponse } from "next/server";
import { createAdminToken, getAdminCookieName } from "../../../lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const password = String(body?.password ?? "");
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: "ADMIN_PASSWORD is not set" }, { status: 500 });
  }

  if (!password || password !== adminPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await createAdminToken(adminPassword);
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: getAdminCookieName(),
    value: token,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
