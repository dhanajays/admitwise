import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { jwtVerify } from "jose"

const ADMIN_COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Secure-admin_session" : "admin_session"

function getJwtSecret(): string {
  return process.env.NEXTAUTH_SECRET || "admitwise-admin-secret"
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll().map(c => c.name)
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value

    const secretVal = getJwtSecret()
    const secretLength = secretVal.length
    const secretIsFallback = secretVal === "admitwise-admin-secret"

    let nodeVerifySuccess = false
    let nodeVerifyError = null
    let joseVerifySuccess = false
    let joseVerifyError = null

    if (token) {
      // Test Node.js jsonwebtoken verification
      try {
        jwt.verify(token, secretVal)
        nodeVerifySuccess = true
      } catch (err: any) {
        nodeVerifyError = err.message || String(err)
      }

      // Test Edge jose verification
      try {
        const key = new TextEncoder().encode(secretVal)
        await jwtVerify(token, key)
        joseVerifySuccess = true
      } catch (err: any) {
        joseVerifyError = err.message || String(err)
      }
    }

    return NextResponse.json({
      success: true,
      cookiesPresent: allCookies,
      adminCookieFound: !!token,
      cookieLength: token ? token.length : 0,
      env: {
        nodeEnv: process.env.NODE_ENV,
        nextauthUrl: process.env.NEXTAUTH_URL,
        secretLength,
        secretIsFallback,
      },
      verification: {
        nodeVerifySuccess,
        nodeVerifyError,
        joseVerifySuccess,
        joseVerifyError,
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 })
  }
}
