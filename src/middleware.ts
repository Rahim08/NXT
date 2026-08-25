import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Simple API-key auth middleware for Next.js App Router.
 *
 * When NEXT_API_KEY env var is set, every /api/* request must include
 * the same key in the `x-next-api-key` header.
 *
 * When NEXT_API_KEY is not set (local dev), all requests pass through.
 */
export function middleware(request: NextRequest) {
  // Only protect /api/* routes
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const requiredKey = process.env.NEXT_API_KEY;

  // No key configured → allow all (local dev mode)
  if (!requiredKey) {
    return NextResponse.next();
  }

  const providedKey = request.headers.get("x-next-api-key");

  if (!providedKey || providedKey !== requiredKey) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
