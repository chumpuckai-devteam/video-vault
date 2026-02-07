import { NextRequest, NextResponse } from "next/server";
import { getAdminCookieName, verifyAdminToken } from "./lib/auth";

const PROTECTED_API_PREFIXES = [
  "/api/videos",
  "/api/tokens",
  "/api/google",
];

const PROTECTED_PAGE_PREFIXES = ["/admin"];

function isProtectedPath(pathname: string) {
  return (
    PROTECTED_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const unauthorized = () => {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  };

  if (!adminPassword) {
    return unauthorized();
  }

  const token = request.cookies.get(getAdminCookieName())?.value;
  if (!token) {
    return unauthorized();
  }

  const isValid = await verifyAdminToken(token, adminPassword);
  if (!isValid) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/videos", "/api/tokens/:path*", "/api/google/:path*"],
};
