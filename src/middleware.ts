import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAuthPage =
    pathname.startsWith("/portal/login") ||
    pathname.startsWith("/portal/signup") ||
    pathname.startsWith("/portal/forgot-password") ||
    pathname.startsWith("/portal/reset-password");
  const isPendingPage = pathname.startsWith("/portal/pending");
  const isAdminRoute = pathname.startsWith("/portal/admin");

  // ── Unauthenticated: redirect to login ───────────────────────────────────
  if (!user && pathname.startsWith("/portal") && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal/login";
    return NextResponse.redirect(url);
  }

  // ── Authenticated: check profile status and role ─────────────────────────
  if (user && pathname.startsWith("/portal") && !isAuthPage && !isPendingPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status, role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";

    // Non-admin partners with pending/suspended status go to holding page
    if (!isAdmin) {
      if (profile?.status === "pending" || profile?.status === "suspended") {
        const url = request.nextUrl.clone();
        url.pathname = "/portal/pending";
        return NextResponse.redirect(url);
      }
    }

    // ── Admin route protection: only admins may access /portal/admin/* ──────
    if (isAdminRoute && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/portal/:path*"],
};
