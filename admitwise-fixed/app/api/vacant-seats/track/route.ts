import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { getVacantSeatColumn, DB_COLUMN_TO_HEADER } from "@/lib/master-config"

export async function GET() {
  try {
    const activeDataset = await db.vacantSeatDataset.findFirst({
      where: { status: "Active" },
    })

    return NextResponse.json({
      active: !!activeDataset,
    })
  } catch (error) {
    console.error("Error in /api/vacant-seats/track GET:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // 1. Session Auth Check
    const session = (await getServerSession(authOptions)) as CustomSession
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.loginProvider === "google" && session.user.isFirstGoogleSignup === true) {
      return NextResponse.json(
        { error: "Please complete your profile by providing a phone number first.", code: "PROFILE_INCOMPLETE" },
        { status: 403 }
      )
    }

    const userId = session.user.id
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { trackerCategoryProfiles: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 2. Subscription Gate Check
    const hasPlan = user.profileLimit > 0
    if (!hasPlan) {
      return NextResponse.json({ error: "No active plan found", code: "NO_ACTIVE_PLAN" }, { status: 403 })
    }

    const {
      exam,
      round,
      gender,
      category,
      homeUniversity,
      preferredBranches = [],
      pwd = false,
      defense = false,
    } = await req.json()

    if (!exam || !round || !gender || !category) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const activeSubs = await db.subscription.findMany({
      where: { userId, status: "active" }
    })

    const planTiers: Record<string, number> = {
      free: 0,
      single: 1,
      multi_round: 2,
      premium: 3,
      elite: 4,
    }

    let basePlan = "free"
    for (const sub of activeSubs) {
      const subTier = planTiers[sub.planId] || 0
      const highestTier = planTiers[basePlan] || 0
      if (subTier > highestTier) {
        basePlan = sub.planId
      }
    }

    // 3. Subscription Restrictions: Freeze/Limit category profiles dynamically
    const trackerProfiles = user.trackerCategoryProfiles || []
    const maxTracker = user.trackerProfileLimit || 0

    const matchedProfile = trackerProfiles.find((p) => {
      if (basePlan === "single") {
        return p.category.toUpperCase() === category.toUpperCase() && p.round === round
      } else {
        return p.exam === exam && p.category.toUpperCase() === category.toUpperCase()
      }
    })

    if (!matchedProfile) {
      if (basePlan === "single") {
        if (trackerProfiles.length >= maxTracker) {
          return NextResponse.json({
            error: `Your plan tracker profile limit has been reached (${maxTracker}/${maxTracker} used). To track seats for a new combination, please upgrade your plan.`,
            code: "CATEGORY_LOCKED",
          }, { status: 403 })
        }
      } else {
        const uniqueCategories = Array.from(new Set(trackerProfiles.map((p) => p.category.toUpperCase())))
        if (!uniqueCategories.includes(category.toUpperCase())) {
          if (uniqueCategories.length >= maxTracker) {
            return NextResponse.json({
              error: `Your plan tracker profile limit has been reached (${maxTracker}/${maxTracker} used). To track seats for a new combination, please upgrade your plan.`,
              code: "CATEGORY_LOCKED",
            }, { status: 403 })
          }
        }
      }
    }

    // 4. Query active dataset for chosen CAP Round
    const activeDataset = await db.vacantSeatDataset.findFirst({
      where: {
        status: "Active",
        exam,
        round,
      },
    })

    if (!activeDataset) {
      return NextResponse.json({
        error: "Vacant Seat Tracker will become available after the official vacant seat matrix is published before each CAP Round.",
        code: "NO_ACTIVE_DATASET",
      }, { status: 404 })
    }

    // 5. Match category columns using standardized master lookup config
    const targetSeatColumn = getVacantSeatColumn(category, gender)

    // 6. DB Indexed filtering query: only query rows with seats > 0 in matched pools
    const whereConditions: any = {
      datasetId: activeDataset.id,
      OR: [
        { [targetSeatColumn]: { gt: 0 } },
        ...(pwd ? [{ pwdCommon: { gt: 0 } }] : []),
        ...(defense ? [{ defCommon: { gt: 0 } }] : []),
      ],
    }

    // Filter by branch name if preferred list is provided
    if (preferredBranches.length > 0) {
      whereConditions.courseName = {
        in: preferredBranches,
      }
    }

    const seats = await db.vacantSeat.findMany({
      where: whereConditions,
    })

    // 7. Format matching items separating results for transparency
    const results: any[] = []

    for (const seat of seats) {
      const catCount = (seat as any)[targetSeatColumn] || 0
      const pwdCount = pwd ? (seat.pwdCommon || 0) : 0
      const defCount = defense ? (seat.defCommon || 0) : 0

      // Add PwD seat pool result card if available (Highest Priority: 1)
      if (pwd && pwdCount > 0) {
        results.push({
          id: `${seat.id}-pwd`,
          instituteName: seat.instituteName,
          courseName: seat.courseName,
          instituteType: seat.instituteType,
          choiceCode: seat.choiceCode,
          round: seat.round,
          availableSeats: pwdCount,
          seatCategory: "PWD_Common",
          matchedThrough: "PwD Reservation",
          priority: 1,
          seatLabel: "Available PwD Seats",
          homeUniversity: "Maharashtra State",
          branch: seat.courseName,
          instituteCode: seat.instituteCode,
        })
      }

      // Add Defence seat pool result card if available (Second Priority: 2)
      if (defense && defCount > 0) {
        results.push({
          id: `${seat.id}-def`,
          instituteName: seat.instituteName,
          courseName: seat.courseName,
          instituteType: seat.instituteType,
          choiceCode: seat.choiceCode,
          round: seat.round,
          availableSeats: defCount,
          seatCategory: "DEF_Common",
          matchedThrough: "Defence Reservation",
          priority: 2,
          seatLabel: "Available Defence Seats",
          homeUniversity: "Maharashtra State",
          branch: seat.courseName,
          instituteCode: seat.instituteCode,
        })
      }

      // Add category seat pool result card if available (Third Priority: 3)
      if (catCount > 0) {
        results.push({
          id: `${seat.id}-cat`,
          instituteName: seat.instituteName,
          courseName: seat.courseName,
          instituteType: seat.instituteType,
          choiceCode: seat.choiceCode,
          round: seat.round,
          availableSeats: catCount,
          seatCategory: DB_COLUMN_TO_HEADER[targetSeatColumn] || category,
          matchedThrough: "Category Seat",
          priority: 3,
          seatLabel: "Available Seats",
          homeUniversity: "Maharashtra State",
          branch: seat.courseName,
          instituteCode: seat.instituteCode,
        })
      }
    }

    // Sort results strictly by Priority (1: PwD, 2: Defence, 3: Category), and then by seat count descending
    results.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      return b.availableSeats - a.availableSeats
    })

    // If the category-round combination is new and we have valid results, register the category profile now!
    if (results.length > 0 && !matchedProfile) {
      let profilePlanId = user.currentPlan
      if (basePlan === "single") {
        const singleSubs = await db.subscription.findMany({
          where: { userId, planId: "single", status: "active" },
          orderBy: { activatedAt: "asc" }
        })
        const index = user.trackerCategoryProfiles.length
        if (index < singleSubs.length) {
          profilePlanId = singleSubs[index].id
        } else if (singleSubs.length > 0) {
          profilePlanId = singleSubs[singleSubs.length - 1].id
        }
      }

      // Create the tracker profile
      await db.trackerCategoryProfile.create({
        data: {
          userId,
          exam,
          round,
          category,
          planId: profilePlanId,
          isLocked: true,
          usageCount: 1,
        },
      })

      // Update trackerProfilesUsed counter in user table
      await db.user.update({
        where: { id: userId },
        data: {
          trackerProfilesUsed: {
            increment: 1,
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("Error in /api/vacant-seats/track POST:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
