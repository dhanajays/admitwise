import jwt from "jsonwebtoken"
import { cookies } from "next/headers"
import { db } from "@/lib/db"

const ADMIN_COOKIE_NAME = "admin_session"
const JWT_SECRET = process.env.NEXTAUTH_SECRET || "admitwise-admin-secret"
const ADMIN_ROLES = ["Super Admin", "Manager", "Support Executive", "Counsellor"]

export interface AdminSessionPayload {
  userId: string
  email: string
  name: string
  role: string
}

/**
 * Sign an admin JWT token.
 */
export function signAdminToken(payload: AdminSessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" })
}

/**
 * Verify and decode an admin JWT token.
 */
export function verifyAdminToken(token: string): AdminSessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminSessionPayload
  } catch {
    return null
  }
}

/**
 * Get the admin session from the request cookie store.
 * Returns AdminSessionPayload or null.
 */
export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value
  if (!token) return null
  return verifyAdminToken(token)
}

/**
 * Authenticate admin credentials and return session payload if valid.
 */
export async function authenticateAdmin(
  email: string,
  password: string
): Promise<AdminSessionPayload | null> {
  const bcrypt = await import("bcryptjs")

  const user = await db.user.findUnique({
    where: { email },
    include: { role: true },
  })

  if (!user || !user.passwordHash) return null
  if (!user.role || !ADMIN_ROLES.includes(user.role.name)) return null
  if (user.isSuspended) return null

  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) return null

  // Update last login
  await db.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  })

  return {
    userId: user.id,
    email: user.email!,
    name: user.name || "Admin",
    role: user.role.name,
  }
}

/**
 * Set the admin session cookie in the response headers.
 */
export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  }
}

export { ADMIN_COOKIE_NAME, ADMIN_ROLES }
