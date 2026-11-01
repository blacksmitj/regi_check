import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16 Proxy Convention
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cek session token dari cookie (Better-Auth uses better-auth.session_token)
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  // Daftar rute dashboard yang diproteksi
  const isDashboardRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/workspaces") ||
    pathname.startsWith("/templates") ||
    pathname.startsWith("/officers") ||
    pathname.startsWith("/audit-logs") ||
    pathname.startsWith("/profile");

  // Jika belum login dan mengakses area dashboard, arahkan ke login beserta callbackUrl
  if (isDashboardRoute && !sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Jika sudah login dan mengakses halaman login, arahkan ke root '/'
  if (pathname === "/login" && sessionToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/workspaces/:path*",
    "/templates/:path*",
    "/officers/:path*",
    "/audit-logs/:path*",
    "/profile/:path*",
    "/login",
  ],
};

