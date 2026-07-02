import { NextAuthOptions, Session, User as NextAuthUser } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { db } from "@/lib/db"
import * as bcrypt from "bcryptjs"

export interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  role: string
  currentPlan: string
  profileLimit: number
  profilesUsed: number
  trackerProfileLimit: number
  trackerProfilesUsed: number
  isSuspended: boolean
  mobile?: string | null
  loginProvider?: string | null
  isFirstGoogleSignup?: boolean
}

export interface CustomSession extends Session {
  user: SessionUser
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-google-client-secret",
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null

        const { email, password } = credentials

        // ── Password Login ────────────────────────────────────────────────
        if (!email) throw new Error("Email is required")

        const user = await db.user.findUnique({
          where: { email },
          include: { role: true },
        })

        if (!user) {
          throw new Error("No user found with this email")
        }

        if (user.isSuspended) {
          throw new Error("Your account has been suspended. Please contact support.")
        }

        if (!user.passwordHash) {
          throw new Error("This account uses a different login method")
        }

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) {
          throw new Error("Incorrect password")
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role?.name || "Student",
          currentPlan: user.currentPlan || "free",
          profileLimit: user.profileLimit,
          profilesUsed: user.profilesUsed,
          trackerProfileLimit: user.trackerProfileLimit,
          trackerProfilesUsed: user.trackerProfilesUsed,
          purchasedAddons: user.purchasedAddons,
          isSuspended: user.isSuspended,
        } as any
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        if (!user.email) return false
 
        let dbUser = await db.user.findUnique({
          where: { email: user.email },
          include: { role: true },
        })
 
        const studentRole = await db.role.findFirst({
          where: { name: "Student" },
        })
 
        if (!dbUser) {
          // Create student
          dbUser = await db.user.create({
            data: {
              email: user.email,
              name: user.name || "Student",
              image: user.image,
              emailVerified: new Date(),
              loginProvider: "google",
              isFirstGoogleSignup: true,
              currentPlan: "free", // Default to free plan on sign up
              profileLimit: 0,
              trackerProfileLimit: 0,
              roleId: studentRole?.id,
            },
            include: { role: true },
          })
        } else {
          // Update google login audit info
          await db.user.update({
            where: { id: dbUser.id },
            data: {
              lastLogin: new Date(),
              loginProvider: "google",
            },
          })
        }
 
        if (dbUser.isSuspended) {
          return false
        }
 
        // Attach custom database fields to user object for JWT callback
        user.id = dbUser.id
        ;(user as any).role = dbUser.role?.name || "Student"
        ;(user as any).currentPlan = dbUser.currentPlan || "free"
        ;(user as any).profileLimit = dbUser.profileLimit
        ;(user as any).profilesUsed = dbUser.profilesUsed
        ;(user as any).trackerProfileLimit = dbUser.trackerProfileLimit
        ;(user as any).trackerProfilesUsed = dbUser.trackerProfilesUsed
        ;(user as any).purchasedAddons = dbUser.purchasedAddons
        ;(user as any).isSuspended = dbUser.isSuspended
        ;(user as any).mobile = dbUser.mobile
        ;(user as any).loginProvider = dbUser.loginProvider
        ;(user as any).isFirstGoogleSignup = dbUser.isFirstGoogleSignup
      }
      return true
    },
    async jwt({ token, user, trigger, session }) {
      // ── On initial sign-in: attach custom fields to token ────────────────
      if (user) {
        let finalUserId = user.id
        let finalRole = (user as any).role || "Student"
        let finalPlan = (user as any).currentPlan || "free"
        let pLimit = (user as any).profileLimit ?? 1
        let tLimit = (user as any).trackerProfileLimit ?? 1
        let pAddons = (user as any).purchasedAddons ?? 0
        let isSuspended = (user as any).isSuspended ?? false
        let profilesUsed = (user as any).profilesUsed ?? 0
        let trackerProfilesUsed = (user as any).trackerProfilesUsed ?? 0
        let finalMobile = (user as any).mobile || null
        let finalLoginProvider = (user as any).loginProvider || null
        let finalIsFirstGoogleSignup = (user as any).isFirstGoogleSignup ?? false

        // Always resolve database user by email to retrieve actual CUID database ID
        if (user.email) {
          const dbUser = await db.user.findUnique({
            where: { email: user.email },
            include: { role: true },
          })
          if (dbUser) {
            finalUserId = dbUser.id
            finalRole = dbUser.role?.name || "Student"
            finalPlan = dbUser.currentPlan || "free"
            pLimit = dbUser.profileLimit
            tLimit = dbUser.trackerProfileLimit
            pAddons = dbUser.purchasedAddons
            isSuspended = dbUser.isSuspended
            profilesUsed = dbUser.profilesUsed
            trackerProfilesUsed = dbUser.trackerProfilesUsed
            finalMobile = dbUser.mobile
            finalLoginProvider = dbUser.loginProvider
            finalIsFirstGoogleSignup = dbUser.isFirstGoogleSignup
          }
        }

        token.id = finalUserId
        token.role = finalRole
        token.currentPlan = finalPlan
        token.mobile = finalMobile
        token.loginProvider = finalLoginProvider
        token.isFirstGoogleSignup = finalIsFirstGoogleSignup

        token.profileLimit = pLimit
        token.profilesUsed = profilesUsed
        token.trackerProfileLimit = tLimit
        token.trackerProfilesUsed = trackerProfilesUsed
        token.isSuspended = isSuspended
      }

      // ── Explicit client-side session update ───────────────────────────────
      if (trigger === "update" && session) {
        if (session.currentPlan) token.currentPlan = session.currentPlan
        if (session.profileLimit !== undefined) token.profileLimit = session.profileLimit
        if (session.profilesUsed !== undefined) token.profilesUsed = session.profilesUsed
        if (session.trackerProfileLimit !== undefined) token.trackerProfileLimit = session.trackerProfileLimit
        if (session.trackerProfilesUsed !== undefined) token.trackerProfilesUsed = session.trackerProfilesUsed
        if (session.isSuspended !== undefined) token.isSuspended = session.isSuspended
        if (session.name) token.name = session.name
        if (session.mobile !== undefined) token.mobile = session.mobile
        if (session.loginProvider !== undefined) token.loginProvider = session.loginProvider
        if (session.isFirstGoogleSignup !== undefined) token.isFirstGoogleSignup = session.isFirstGoogleSignup
      }

      // Re-fetch current plan state from DB on every JWT validation to avoid stale values
      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            currentPlan: true,
            profileLimit: true,
            profilesUsed: true,
            trackerProfileLimit: true,
            trackerProfilesUsed: true,
            isSuspended: true,
            name: true,
            mobile: true,
            loginProvider: true,
            isFirstGoogleSignup: true,
          },
        })
        if (dbUser) {
          token.currentPlan = dbUser.currentPlan
          token.profileLimit = dbUser.profileLimit
          token.profilesUsed = dbUser.profilesUsed
          token.trackerProfileLimit = dbUser.trackerProfileLimit
          token.trackerProfilesUsed = dbUser.trackerProfilesUsed
          token.isSuspended = dbUser.isSuspended
          token.mobile = dbUser.mobile
          token.loginProvider = dbUser.loginProvider
          token.isFirstGoogleSignup = dbUser.isFirstGoogleSignup
          if (dbUser.name) token.name = dbUser.name
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        const customSession = session as CustomSession
        customSession.user.id = token.id as string
        customSession.user.role = token.role as string
        customSession.user.currentPlan = token.currentPlan as string
        customSession.user.profileLimit = token.profileLimit as number
        customSession.user.profilesUsed = token.profilesUsed as number
        customSession.user.trackerProfileLimit = token.trackerProfileLimit as number
        customSession.user.trackerProfilesUsed = token.trackerProfilesUsed as number
        customSession.user.isSuspended = token.isSuspended as boolean
        customSession.user.mobile = token.mobile as string | null
        customSession.user.loginProvider = token.loginProvider as string | null
        customSession.user.isFirstGoogleSignup = token.isFirstGoogleSignup as boolean
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`
      }
      try {
        const urlObj = new URL(url)
        const baseObj = new URL(baseUrl)
        if (urlObj.hostname === baseObj.hostname) {
          return url
        }
      } catch {
        // Fallback
      }
      return baseUrl
    },
  },
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
    newUser: "/dashboard",
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  logger: {
    error(code, metadata) {
      console.error("[NextAuth Error]", code, metadata)
    },
    warn(code) {
      console.warn("[NextAuth Warning]", code)
    },
    debug(code, metadata) {
      console.log("[NextAuth Debug]", code, metadata)
    },
  },
}
