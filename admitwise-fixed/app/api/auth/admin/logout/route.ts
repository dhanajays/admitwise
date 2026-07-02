import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { ADMIN_COOKIE_NAME, getAdminCookieOptions } from "@/lib/admin-auth"

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE_NAME, "", {
    ...getAdminCookieOptions(),
    maxAge: 0,
  })
  return NextResponse.redirect(
    new URL("/admin/login", process.env.NEXTAUTH_URL || "http://localhost:3000"),
    {
      status: 303,
    }
  )
}
