import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

/**
 * First gate on /admin. Runs before any admin code loads, so an
 * unauthenticated request never reaches a page that queries the database.
 *
 * This is NOT the only gate — the Edge runtime cannot read SQLite, so the
 * role here comes from the signed token. Every admin page and mutation
 * re-checks the role against the database via requireAdmin().
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (session.role !== "admin") {
    // Signed in, but not an admin: send them away without confirming the
    // panel exists.
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "?denied=admin";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
