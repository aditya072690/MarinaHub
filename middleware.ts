import { updateSession } from "@/lib/supabase/middleware";
import {
  isSafeRedirect,
  parseAuthIntent,
  INTENT_COOKIE,
  MARINA_COOKIE,
} from "@/lib/auth/intent";
import type { UserRole } from "@/types/database";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const OWNER_ONLY_PATHS = [
  "/dashboard/team",
  "/dashboard/settings",
  "/dashboard/widget",
  "/dashboard/payments",
  "/dashboard/audit-logs",
];
const MANAGER_PATHS = [
  "/dashboard/boats/new",
  "/dashboard/availability",
  "/dashboard/maintenance",
  "/dashboard/email-templates",
];
const STAFF_BLOCKED_PATHS = [
  "/dashboard/boats",
  "/dashboard/availability",
  "/dashboard/maintenance",
  "/dashboard/waitlist",
  "/dashboard/customers/segments",
];

const LEGACY_CONSUMER_AUTH = ["/account/login", "/account/signup"];
const LEGACY_MARINA_AUTH = ["/marina/login", "/marina/signup"];
const UNIFIED_AUTH_PUBLIC = [
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/callback",
];

function isLegacyConsumerAuth(pathname: string) {
  return LEGACY_CONSUMER_AUTH.includes(pathname);
}

function isLegacyMarinaAuth(pathname: string) {
  return LEGACY_MARINA_AUTH.includes(pathname);
}

function isUnifiedAuthPublic(pathname: string) {
  return UNIFIED_AUTH_PUBLIC.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isProtectedAccountPath(pathname: string) {
  return pathname.startsWith("/account") && !isLegacyConsumerAuth(pathname);
}

function createMiddlewareSupabase(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  );
}

function setActiveMarinaCookieOnResponse(
  response: NextResponse,
  marinaId: string
) {
  response.cookies.set(MARINA_COOKIE, marinaId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

async function resolveActiveMarinaMembership(
  request: NextRequest,
  userId: string
): Promise<{
  marinaId: string | null;
  role: UserRole | null;
  hasMembership: boolean;
}> {
  const supabase = createMiddlewareSupabase(request);
  const cookieMarina = request.cookies.get("mh_marina")?.value;

  const { data: memberships } = await supabase
    .from("marina_members")
    .select("marina_id, role")
    .eq("user_id", userId);

  if (!memberships?.length) {
    return { marinaId: null, role: null, hasMembership: false };
  }

  const match = cookieMarina
    ? memberships.find((m) => m.marina_id === cookieMarina)
    : null;
  const active = match ?? memberships[0];

  return {
    marinaId: active.marina_id,
    role: active.role as UserRole,
    hasMembership: true,
  };
}

async function hasMarinaMembership(request: NextRequest, userId: string) {
  const { hasMembership } = await resolveActiveMarinaMembership(request, userId);
  return hasMembership;
}

function redirectWithoutMembership(
  request: NextRequest,
  intent: ReturnType<typeof parseAuthIntent>
) {
  const url = request.nextUrl.clone();
  url.pathname = intent === "consumer" ? "/account" : "/onboarding";
  url.search = "";
  return NextResponse.redirect(url);
}

async function resolveAuthenticatedHome(
  request: NextRequest,
  userId: string
): Promise<string> {
  const intent = parseAuthIntent(request.cookies.get(INTENT_COOKIE)?.value);
  const redirectTo = request.nextUrl.searchParams.get("redirect");
  const hasMembership = await hasMarinaMembership(request, userId);

  if (isSafeRedirect(redirectTo)) {
    if (redirectTo.startsWith("/dashboard") && !hasMembership) {
      return intent === "consumer" ? "/account" : "/onboarding";
    }
    return redirectTo;
  }

  if (intent === "consumer") {
    return "/account";
  }

  if (intent === "marina") {
    return hasMembership ? "/dashboard" : "/onboarding";
  }

  if (hasMembership) {
    return "/dashboard";
  }

  return "/";
}

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse, error } = await updateSession(request);

  if (error === "refresh_token_not_found") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("intent", "consumer");
    return NextResponse.redirect(url);
  }
  const { pathname } = request.nextUrl;

  if (pathname === "/signup") {
    const url = request.nextUrl.clone();
    url.pathname = "/marina/signup";
    return NextResponse.redirect(url);
  }

  if (isProtectedAccountPath(pathname)) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("intent", "consumer");
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("intent", "marina");
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const intent = parseAuthIntent(request.cookies.get(INTENT_COOKIE)?.value);
    const { role, hasMembership, marinaId } = await resolveActiveMarinaMembership(
      request,
      user.id
    );

    if (!hasMembership) {
      return redirectWithoutMembership(request, intent);
    }

    if (marinaId && request.cookies.get(MARINA_COOKIE)?.value !== marinaId) {
      setActiveMarinaCookieOnResponse(supabaseResponse, marinaId);
    }

    if (OWNER_ONLY_PATHS.some((p) => pathname.startsWith(p)) && role !== "owner") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (STAFF_BLOCKED_PATHS.some((p) => pathname.startsWith(p)) && role === "staff") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (MANAGER_PATHS.some((p) => pathname.startsWith(p)) && role === "staff") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (pathname === "/dashboard/analytics" && role === "staff") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/onboarding") {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("intent", "marina");
      return NextResponse.redirect(url);
    }

    const intent = parseAuthIntent(request.cookies.get(INTENT_COOKIE)?.value);
    if (intent === "consumer") {
      const url = request.nextUrl.clone();
      url.pathname = "/account";
      return NextResponse.redirect(url);
    }

    const hasMembership = await hasMarinaMembership(request, user.id);
    if (!hasMembership) {
      const { count: customerLinks } = await createMiddlewareSupabase(request)
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if ((customerLinks ?? 0) > 0) {
        const url = request.nextUrl.clone();
        url.pathname = "/account";
        return NextResponse.redirect(url);
      }
    }
  }

  if (
    user &&
    (pathname === "/login" ||
      isLegacyConsumerAuth(pathname) ||
      isLegacyMarinaAuth(pathname) ||
      isUnifiedAuthPublic(pathname))
  ) {
    if (pathname !== "/auth/reset-password" && pathname !== "/auth/forgot-password") {
      const home = await resolveAuthenticatedHome(request, user.id);
      const url = request.nextUrl.clone();
      url.pathname = home;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding",
    "/login",
    "/signup",
    "/account/:path*",
    "/marina/:path*",
    "/auth/:path*",
  ],
};
