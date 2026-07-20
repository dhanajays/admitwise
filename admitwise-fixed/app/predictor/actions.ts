"use server"

import { getServerSession } from "next-auth/next"
import { authOptions, CustomSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { loadCutoffs } from "@/lib/predictor/data"
import { predict, predictAllIndia } from "@/lib/predictor/engine"
import type { PredictionResult, StudentInput } from "@/lib/predictor/types"
import { promises as fs } from "fs"
import path from "path"

export async function runPrediction(
  input: StudentInput
): Promise<{
  predictions: PredictionResult[]
  error?: string
  code?: string
}> {
  try {
    const session = (await getServerSession(authOptions)) as CustomSession
    if (session?.user && session.user.loginProvider === "google" && session.user.isFirstGoogleSignup === true) {
      return {
        predictions: [],
        error: "Please complete your profile by providing a phone number first.",
        code: "PROFILE_INCOMPLETE",
      }
    }
    const userId = session?.user?.id

    let predictions: PredictionResult[] = []

    if (input.predictionType === "all-india") {
      const dbRound = input.stage === "I" ? "Round I" : input.stage === "II" ? "Round II" : input.stage === "III" ? "Round III" : "Round IV"
      
      const activeDataset = await db.allIndiaDataset.findFirst({
        where: {
          status: "Active",
          round: dbRound,
        },
      })

      if (!activeDataset) {
        const roundName = input.stage === "I" ? "Round I" : input.stage === "II" ? "Round II" : input.stage === "III" ? "Round III" : "Round IV"
        return {
          predictions: [],
          error: `${roundName} cutoff dataset has not been uploaded yet.`,
          code: "NO_ACTIVE_DATASET",
        }
      }

      const dbCutoffs = await db.allIndiaCutoff.findMany({
        where: {
          datasetId: activeDataset.id,
        },
      })

      if (dbCutoffs.length === 0) {
        return {
          predictions: [],
          error: `The active All India Seat Predictor dataset for Round ${input.stage} contains 0 records. Please upload a valid CSV.`,
          code: "EMPTY_DATASET",
        }
      }

      predictions = predictAllIndia(input, dbCutoffs)
    } else {
      const dbRound = input.stage === "I" ? "Round 1" : input.stage === "II" ? "Round 2" : input.stage === "III" ? "Round 3" : "Round 4"
      
      const activeDataset = await db.dataset.findFirst({
        where: {
          status: "Active",
          round: dbRound,
          exam: input.exam,
        },
      })

      // Check if local CSV file exists as fallback
      let hasCsvFallback = false
      const csvFileName = input.stage === "I" ? "CAP Round 1.csv" : input.stage === "II" ? "CAP Round 2.csv" : input.stage === "III" ? "CAP Round 3.csv" : "CAP Round 4.csv"
      const filePath = path.join(process.cwd(), "data", csvFileName)
      try {
        await fs.access(filePath)
        hasCsvFallback = true
      } catch {
        if (input.stage === "I") {
          try {
            await fs.access(path.join(process.cwd(), "data", "cutoffs.csv"))
            hasCsvFallback = true
          } catch {}
        }
      }

      if (!activeDataset && !hasCsvFallback) {
        return {
          predictions: [],
          error: `No active MHT CET Predictor dataset is available for Round ${input.stage}. Please upload and activate it in the Admin Panel.`,
          code: "NO_ACTIVE_DATASET",
        }
      }

      const rows = await loadCutoffs(input.stage, input.exam)
      predictions = predict(input, rows)
    }

    // Log the prediction run in database
    let hasSavedHistory = false
    if (session && session.user && userId) {
      try {
        const dbUser = await db.user.findUnique({
          where: { id: userId },
          include: {
            subscriptions: true,
          },
        })

        const hasActiveSub = dbUser?.subscriptions?.some((s) => s.status === "active")
        if (dbUser && hasActiveSub) {
          const topRec = predictions[0]
          const branchStr = input.preferredBranches.length > 0
            ? input.preferredBranches.join(", ")
            : "All Branches"

          const examName = input.predictionType === "all-india" && input.examsList
            ? input.examsList.map((e) => `${e.exam}:${e.percentile}`).join(", ")
            : input.exam

          const maxPercentile = input.predictionType === "all-india" && input.examsList && input.examsList.length > 0
            ? Math.max(...input.examsList.map((e) => e.percentile))
            : input.percentile

          await db.predictionHistory.create({
            data: {
              userId,
              studentName: session.user.name || "Student",
              exam: examName,
              percentile: maxPercentile,
              branch: branchStr,
              category: input.category,
              closingPercentile: topRec ? topRec.closingPercentile : 0.0,
              closingRank: topRec ? topRec.closingRank : 0,
              chance: topRec ? topRec.chance : "Low",
            },
          })

          await db.activityLog.create({
            data: {
              userId,
              action: "PREDICTION_RUN",
              details: `Predicted colleges for ${examName} (${maxPercentile} percentile, ${input.category})`,
            },
          })
          
          hasSavedHistory = true
        }
      } catch (dbErr) {
        console.error("Failed to save prediction history to DB:", dbErr)
        // Fail silently so prediction results are still returned to the user
      }
    }

    if (!hasSavedHistory) {
      try {
        const examName = input.predictionType === "all-india" && input.examsList
          ? input.examsList.map((e) => `${e.exam}:${e.percentile}`).join(", ")
          : input.exam

        const maxPercentile = input.predictionType === "all-india" && input.examsList && input.examsList.length > 0
          ? Math.max(...input.examsList.map((e) => e.percentile))
          : input.percentile

        await db.activityLog.create({
          data: {
            action: "GUEST_PREDICTION_RUN",
            details: `Guest/Free predicted colleges for ${examName} (${maxPercentile} percentile, ${input.category})`,
          },
        })
      } catch (dbErr) {
        console.error("Failed to save guest activity log to DB:", dbErr)
      }
    }

    return { predictions }
  } catch (error: any) {
    console.error("Prediction Error:", error)
    return {
      predictions: [],
      error: "Internal Server Error during prediction. Please try again.",
      code: "PREDICTION_ERROR",
    }
  }
}
