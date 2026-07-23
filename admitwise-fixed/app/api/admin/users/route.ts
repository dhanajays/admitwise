import { getAdminSession } from "@/lib/admin-auth"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import * as bcrypt from "bcryptjs"

async function checkAdminRole() {
  const session = await getAdminSession()
  if (!session) return null
  const allowedRoles = ["Super Admin", "Manager", "Support Executive", "Counsellor"]
  if (!allowedRoles.includes(session.role)) return null
  return session
}

export async function GET(req: Request) {
  try {
    const session = await checkAdminRole()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    // If userId specified, return their full details + prediction history
    if (userId) {
      let student: any = null
      try {
        student = await db.user.findUnique({
          where: { id: userId },
          include: {
            predictionProfiles: true,
            predictionHistories: {
              orderBy: { createdAt: "desc" },
            },
            payments: {
              orderBy: { createdAt: "desc" },
            },
            preferenceGeneratorPurchases: {
              orderBy: { createdAt: "desc" },
            },
            preferenceGeneratorHistories: {
              orderBy: { createdAt: "desc" },
            },
          },
        })
      } catch (detailErr: any) {
        console.error("[admin/users GET] findUnique fallback triggered:", detailErr.message)
        student = await db.user.findUnique({
          where: { id: userId },
          include: {
            predictionProfiles: true,
            predictionHistories: {
              orderBy: { createdAt: "desc" },
            },
            payments: {
              orderBy: { createdAt: "desc" },
            },
          },
        })
      }

      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }

      return NextResponse.json(student)
    }

    // Otherwise list all students
    let students: any[] = []
    try {
      students = await db.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          role: true,
          predictionProfiles: true,
          preferenceGeneratorPurchases: true,
          preferenceSavedPercentiles: true,
        },
      })
    } catch (queryErr: any) {
      console.error("[admin/users GET] findMany fallback triggered:", queryErr.message)
      students = await db.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          role: true,
          predictionProfiles: true,
        },
      })
    }

    const formatted = students.map((u: any) => {
      const includedSlots = u.currentPlan === "premium" ? 3 : u.currentPlan === "elite" ? 4 : 0
      const purchasedAddons = Array.isArray(u.preferenceGeneratorPurchases)
        ? u.preferenceGeneratorPurchases.filter((p: any) => p.status === "Paid").length
        : 0
      const totalMaxSlots = includedSlots + purchasedAddons
      const usedSlots = Array.isArray(u.preferenceSavedPercentiles) ? u.preferenceSavedPercentiles.length : 0

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        loginProvider: u.loginProvider,
        currentPlan: u.currentPlan,
        paymentStatus: u.paymentStatus,
        profileLimit: u.profileLimit,
        profilesUsed: u.profilesUsed,
        isSuspended: u.isSuspended,
        role: u.role?.name || "Student",
        hasPreferenceAccess: totalMaxSlots > 0,
        preferenceTotalSlots: totalMaxSlots,
        preferenceUsedSlots: usedSlots,
        preferencePurchases: Array.isArray(u.preferenceGeneratorPurchases)
          ? u.preferenceGeneratorPurchases.filter((p: any) => p.status === "Paid")
          : [],
      }
    })

    return NextResponse.json(formatted)
  } catch (error: any) {
    console.error("[admin/users GET] Error fetching users:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}


export async function POST(req: Request) {
  try {
    const session = await checkAdminRole()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action, userId, planId, limit, isSuspended, password } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // ── 1. Suspend / Activate User ───────────────────────────────────────────
    if (action === "toggle_suspension") {
      if (isSuspended === undefined) {
        return NextResponse.json({ error: "Suspension state required" }, { status: 400 })
      }

      await db.user.update({
        where: { id: userId },
        data: { isSuspended },
      })

      await db.activityLog.create({
        data: {
          userId: session.userId,
          action: isSuspended ? "USER_SUSPEND" : "USER_ACTIVATE",
          details: `${isSuspended ? "Suspended" : "Activated"} user ${user.email}`,
        },
      })

      return NextResponse.json({ success: true, message: `User suspension toggled to ${isSuspended}` })
    }

    // ── 2. Upgrade User Plan ─────────────────────────────────────────────────
    if (action === "upgrade_plan") {
      if (!planId) {
        return NextResponse.json({ error: "Plan ID is required" }, { status: 400 })
      }

      const plan = await db.plan.findUnique({ where: { id: planId } })
      if (!plan) {
        return NextResponse.json({ error: "Invalid Plan ID" }, { status: 400 })
      }

      await db.user.update({
        where: { id: userId },
        data: {
          currentPlan: planId,
          profileLimit: plan.maxProfiles + user.purchasedAddons,
          trackerProfileLimit: plan.maxProfiles + user.purchasedAddons,
          paymentStatus: "paid",
        },
      })

      // Expire previous active subscriptions
      await db.subscription.updateMany({
        where: { userId, status: "active" },
        data: { status: "expired", expiresAt: new Date() },
      })

      // Add subscription entry
      await db.subscription.create({
        data: {
          userId,
          planId,
          maxProfiles: plan.maxProfiles,
          trackerMaxProfiles: plan.maxProfiles,
          status: "active",
        },
      })

      await db.activityLog.create({
        data: {
          userId: session.userId,
          action: "ADMIN_USER_UPGRADE",
          details: `Manually upgraded user ${user.email} to plan ${planId}`,
        },
      })

      return NextResponse.json({ success: true, message: `User upgraded to ${plan.name}` })
    }

    // ── 3. Increase Percentile Profile Limit ─────────────────────────────────
    if (action === "change_limit") {
      if (limit === undefined || typeof limit !== "number") {
        return NextResponse.json({ error: "Valid limit is required" }, { status: 400 })
      }

      await db.user.update({
        where: { id: userId },
        data: {
          profileLimit: limit,
          trackerProfileLimit: limit,
        },
      })

      await db.activityLog.create({
        data: {
          userId: session.userId,
          action: "ADMIN_LIMIT_CHANGE",
          details: `Changed profile limit of user ${user.email} to ${limit}`,
        },
      })

      return NextResponse.json({ success: true, message: `Profile limit set to ${limit}` })
    }

    // ── 4. Reset User Password ───────────────────────────────────────────────
    if (action === "reset_password") {
      if (!password || password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
      }

      const passwordHash = await bcrypt.hash(password, 10)
      await db.user.update({
        where: { id: userId },
        data: { passwordHash },
      })

      await db.activityLog.create({
        data: {
          userId: session.userId,
          action: "ADMIN_PASSWORD_RESET",
          details: `Reset password of user ${user.email}`,
        },
      })

      return NextResponse.json({ success: true, message: "Password reset successfully" })
    }

    // ── 5. Grant / Revoke Preference List Generator Access ───────────────────
    if (action === "grant_preference_access") {
      const {
        round = "Round 1",
        accessStatus = "Active",
        accessType = "Preference List Generator (₹599)",
        percentile = 95,
        planType,
      } = body

      console.log("Prisma Models Top Level:", {
        User: !!(db as any)?.user,
        Subscription: !!(db as any)?.subscription,
        PreferenceGeneratorPurchase: !!(db as any)?.preferenceGeneratorPurchase,
        PreferenceSavedPercentile: !!(db as any)?.preferenceSavedPercentile,
        PredictorProfile: !!(db as any)?.predictionProfile,
      })

      console.log("========================================")
      console.log("Preference Access Update Started")
      console.log("========================================")
      console.log("Student ID:", userId)
      console.log("Target Round:", round)
      console.log("Access Status:", accessStatus)
      console.log("Access Type:", accessType)
      console.log("Plan Type:", planType)
      console.log("Percentile:", percentile)
      console.log("Admin ID:", session.userId)

      try {
        const result = await db.$transaction(async (tx) => {
          console.log("Transaction Keys:", Object.keys(tx))
          console.log("Model Exists on tx:", {
            user: !!(tx as any)?.user,
            subscription: !!(tx as any)?.subscription,
            preferenceGeneratorPurchase: !!(tx as any)?.preferenceGeneratorPurchase,
            preferenceSavedPercentile: !!(tx as any)?.preferenceSavedPercentile,
          })

          console.log("Loading student...")
          const student = await tx.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, currentPlan: true },
          })

          if (!student) {
            console.error("❌ Student not found with ID:", userId)
            throw new Error(`Student with ID ${userId} not found.`)
          }
          console.log("✓ Student Found:", student.email)

          const normType = (planType || accessType || "").toLowerCase()
          const isRevoking = accessStatus === "No Access" || accessStatus === "Expired"

          if (isRevoking) {
            console.log("Revoking preference access for student...")
            await tx.preferenceGeneratorPurchase.updateMany({
              where: { userId, round },
              data: { status: "Expired" },
            })

            console.log("✓ Preference access revoked.")
            return {
              message: `Preference list access revoked for ${round}`,
              plan: student.currentPlan || "free",
              allowedSavedPercentiles: 0,
              allowedRounds: [],
            }
          }

          // Model resolution with fallback to prevent undefined delegate crashes
          const purchaseModel = (tx as any)?.preferenceGeneratorPurchase || (db as any)?.preferenceGeneratorPurchase
          const savedPercentileModel = (tx as any)?.preferenceSavedPercentile || (db as any)?.preferenceSavedPercentile

          // Case A: Grant ₹5000 Premium Plan
          if (normType.includes("5000") || normType.includes("premium")) {
            console.log("Granting ₹5000 Premium Plan (3 slots, All Rounds)...")

            await tx.user.update({
              where: { id: userId },
              data: {
                currentPlan: "premium",
                profileLimit: 3,
                paymentStatus: "paid",
              },
            })

            await tx.subscription.updateMany({
              where: { userId, status: "active" },
              data: { status: "expired", expiresAt: new Date() },
            })

            const planExists = await tx.plan.findUnique({ where: { id: "premium" } })
            if (planExists) {
              await tx.subscription.create({
                data: {
                  userId,
                  planId: "premium",
                  maxProfiles: 3,
                  trackerMaxProfiles: 3,
                  status: "active",
                },
              })
            }

            console.log("------------------------------------------------");
            console.log("FILE: app/api/admin/users/route.ts");
            console.log("LINE: 375 (Case A)");
            console.log("OBJECT purchaseModel =", purchaseModel);
            console.log("TYPE =", typeof purchaseModel);
            console.log("------------------------------------------------");

            const existingPurchase = purchaseModel?.findFirst
              ? await purchaseModel.findFirst({ where: { userId, round: "ALL" } })
              : null

            if (existingPurchase && purchaseModel?.update) {
              await purchaseModel.update({
                where: { id: existingPurchase.id },
                data: {
                  status: "Paid",
                  savedPercentile: percentile,
                  amount: 5000,
                  paymentId: "admin_manual_premium",
                },
              })
            } else if (purchaseModel?.create) {
              await purchaseModel.create({
                data: {
                  userId,
                  round: "ALL",
                  savedPercentile: percentile,
                  status: "Paid",
                  amount: 5000,
                  paymentId: "admin_manual_premium",
                },
              })
            }

            if (savedPercentileModel?.upsert) {
              await savedPercentileModel.upsert({
                where: {
                  userId_savedPercentile: { userId, savedPercentile: percentile },
                },
                create: { userId, savedPercentile: percentile },
                update: {},
              })
            }

            console.log("✓ Granted ₹5000 Premium Plan successfully.")
            return {
              message: "Granted ₹5000 Premium Plan (3 slots, All Rounds)",
              plan: "premium",
              allowedSavedPercentiles: 3,
              allowedRounds: ["Round 1", "Round 2", "Round 3", "Round 4"],
            }
          }

          // Case B: Grant ₹6000 Elite Plan
          if (normType.includes("6000") || normType.includes("elite")) {
            console.log("Granting ₹6000 Elite Plan (4 slots, All Rounds)...")

            await tx.user.update({
              where: { id: userId },
              data: {
                currentPlan: "elite",
                profileLimit: 4,
                paymentStatus: "paid",
              },
            })

            await tx.subscription.updateMany({
              where: { userId, status: "active" },
              data: { status: "expired", expiresAt: new Date() },
            })

            const planExists = await tx.plan.findUnique({ where: { id: "elite" } })
            if (planExists) {
              await tx.subscription.create({
                data: {
                  userId,
                  planId: "elite",
                  maxProfiles: 4,
                  trackerMaxProfiles: 4,
                  status: "active",
                },
              })
            }

            console.log("------------------------------------------------");
            console.log("FILE: app/api/admin/users/route.ts");
            console.log("LINE: 450 (Case B)");
            console.log("OBJECT purchaseModel =", purchaseModel);
            console.log("TYPE =", typeof purchaseModel);
            console.log("------------------------------------------------");

            const existingPurchase = purchaseModel?.findFirst
              ? await purchaseModel.findFirst({ where: { userId, round: "ALL" } })
              : null

            if (existingPurchase && purchaseModel?.update) {
              await purchaseModel.update({
                where: { id: existingPurchase.id },
                data: {
                  status: "Paid",
                  savedPercentile: percentile,
                  amount: 6000,
                  paymentId: "admin_manual_elite",
                },
              })
            } else if (purchaseModel?.create) {
              await purchaseModel.create({
                data: {
                  userId,
                  round: "ALL",
                  savedPercentile: percentile,
                  status: "Paid",
                  amount: 6000,
                  paymentId: "admin_manual_elite",
                },
              })
            }

            if (savedPercentileModel?.upsert) {
              await savedPercentileModel.upsert({
                where: {
                  userId_savedPercentile: { userId, savedPercentile: percentile },
                },
                create: { userId, savedPercentile: percentile },
                update: {},
              })
            }

            console.log("✓ Granted ₹6000 Elite Plan successfully.")
            return {
              message: "Granted ₹6000 Elite Plan (4 slots, All Rounds)",
              plan: "elite",
              allowedSavedPercentiles: 4,
              allowedRounds: ["Round 1", "Round 2", "Round 3", "Round 4"],
            }
          }

          // Case C: Grant ₹599 Preference List Access for a specific round
          console.log("------------------------------------------------");
          console.log("FILE: app/api/admin/users/route.ts");
          console.log("LINE: 500 (Case C)");
          console.log("OBJECT purchaseModel =", purchaseModel);
          console.log("TYPE =", typeof purchaseModel);
          console.log("------------------------------------------------");

          const existingPurchase = purchaseModel?.findFirst
            ? await purchaseModel.findFirst({ where: { userId, round } })
            : null

          if (existingPurchase && purchaseModel?.update) {
            console.log("Updating existing purchase record ID:", existingPurchase.id)
            await purchaseModel.update({
              where: { id: existingPurchase.id },
              data: {
                status: "Paid",
                savedPercentile: percentile,
                amount: 599,
                paymentId: "admin_manual",
              },
            })
          } else if (purchaseModel?.create) {
            console.log("Creating new purchase record...")
            await purchaseModel.create({
              data: {
                userId,
                round,
                savedPercentile: percentile,
                status: "Paid",
                amount: 599,
                paymentId: "admin_manual",
              },
            })
          }

          if (savedPercentileModel?.upsert) {
            console.log("Updating saved percentile profile...")
            await savedPercentileModel.upsert({
              where: {
                userId_savedPercentile: { userId, savedPercentile: percentile },
              },
              create: { userId, savedPercentile: percentile },
              update: {},
            })
          }

          console.log("✓ Granted Preference List access for", round)
          return {
            message: `Granted Preference List access for ${round}`,
            plan: student.currentPlan || "free",
            allowedSavedPercentiles: 1,
            allowedRounds: [round],
          }
        })

        try {
          await db.activityLog.create({
            data: {
              userId: session.userId,
              action: "ADMIN_PREFERENCE_GRANT",
              details: `Granted Preference List access to user ID ${userId} (${result.plan})`,
            },
          })
        } catch (e) {
          console.warn("Could not record activity log:", e)
        }

        console.log("========================================")
        console.log("Preference Access Update Completed Successfully")
        console.log("========================================")

        return NextResponse.json({
          success: true,
          message: result.message,
          plan: result.plan,
          allowedSavedPercentiles: result.allowedSavedPercentiles,
          allowedRounds: result.allowedRounds,
          unlimitedRegeneration: true,
        })
      } catch (err: any) {
        console.error("========================================")
        console.error("❌ FULL ERROR:", err)
        console.error("FULL STACK:", err?.stack)
        console.error("========================================")

        return NextResponse.json(
          {
            success: false,
            error: String(err?.message || err),
            stack: err?.stack || String(err),
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("========== FULL ERROR ==========")
    console.error(error)
    console.error(error?.stack)
    console.error(error?.code)
    console.error(error?.meta)
    console.error(error?.cause)
    console.error("===============================")
    return NextResponse.json({ success: false, error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await checkAdminRole()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    await db.user.delete({ where: { id: userId } })

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "USER_DELETE",
        details: `Deleted user account: ${user.email}`,
      },
    })

    return NextResponse.json({ success: true, message: "User deleted successfully" })
  } catch (error) {
    console.error("Error in /api/admin/users DELETE:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
