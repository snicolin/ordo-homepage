import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname !== "/signin") {
    const newUrl = new URL("/signin", req.nextUrl.origin);
    return Response.redirect(newUrl);
  }

  if (req.auth && req.nextUrl.pathname === "/") {
    const token = req.auth as unknown as { user?: { defaultPageSlug?: string } };
    const defaultSlug = token.user?.defaultPageSlug;
    if (defaultSlug && typeof defaultSlug === "string") {
      return NextResponse.redirect(new URL(`/${defaultSlug}`, req.nextUrl.origin));
    }
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|images|favicon.ico).*)"],
};
