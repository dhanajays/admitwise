import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const ADMIN_COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Secure-admin_session" : "admin_session"

function getJwtSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || "admitwise-admin-secret"
  return secret
}

async function verifyAdminTokenEdge(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(getJwtSecret())
    await jwtVerify(token, secret)
    return true
  } catch (err) {
    console.error("[Proxy] Token verification failed in Edge runtime:", err)
    return false
  }
}

export const proxy = withAuth(
  async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl
    const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value

    console.log(`[Proxy] Request to Pathname: ${pathname}, Cookie Token exists: ${!!token}`)

    // ── Admin Redirect Rules ───────────────────────────────────────────────
    // If admin is already logged in, redirect /admin/login to /admin dashboard
    if (pathname === "/admin/login") {
      if (token) {
        const isValid = await verifyAdminTokenEdge(token)
        console.log(`[Proxy] Admin Login page request. Token valid: ${isValid}`)
        if (isValid) {
          return NextResponse.redirect(new URL("/admin", req.url))
        }
      }
      return NextResponse.next()
    }

    // Redirect /admin/dashboard request to /admin overview
    if (pathname === "/admin/dashboard") {
      return NextResponse.redirect(new URL("/admin", req.url))
    }

    // Protect all other /admin/* routes
    if (pathname.startsWith("/admin")) {
      if (!token) {
        console.log(`[Proxy] Redirect to /admin/login: Token is missing for pathname: ${pathname}`)
        return NextResponse.redirect(new URL("/admin/login", req.url))
      }
      const isValid = await verifyAdminTokenEdge(token)
      console.log(`[Proxy] Verification result for ${pathname}: ${isValid}`)
      if (!isValid) {
        console.log(`[Proxy] Redirect to /admin/login: Token is invalid for pathname: ${pathname}`)
        return NextResponse.redirect(new URL("/admin/login", req.url))
      }
    }

    // All other checks handled by withAuth below
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ req, token }) {
        const { pathname } = req.nextUrl

        // Admin routes are guarded by the cookie check above — allow through
        if (pathname.startsWith("/admin")) return true

        // These routes need a valid NextAuth session
        if (pathname.startsWith("/dashboard")) {
          return !!token
        }

        // All other routes are public
        return true
      },
    },
    pages: {
      signIn: "/login",
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icons, public assets
     * - /api/auth (NextAuth routes — must always be public)
     * - /api/auth/admin (admin auth routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|api/auth).*)",
  ],
}
