import { NextResponse } from "next/server"
import { ADMIN_COOKIE_NAME, getAdminCookieOptions } from "@/lib/admin-auth"

export async function GET() {
  const response = NextResponse.redirect(new URL("/admin/login", process.env.NEXTAUTH_URL || "http://localhost:3000"))
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    ...getAdminCookieOptions(),
    maxAge: 0,
  })
  return response
}
