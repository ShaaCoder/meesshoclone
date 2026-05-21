import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  /* ============================= */
  /* ✅ PUBLIC ROUTES */
  /* ============================= */
  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/product");

  if (isPublic) return res;

  /* ============================= */
  /* 🔒 REQUIRE LOGIN */
  /* ============================= */
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  /* ============================= */
  /* 🔁 BLOCK LOGIN IF LOGGED IN */
  /* ============================= */
  if (pathname === "/login" || pathname === "/signup") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/cart",
    "/wishlist",
    "/checkout",
    "/login",
    "/signup",
  ],
};