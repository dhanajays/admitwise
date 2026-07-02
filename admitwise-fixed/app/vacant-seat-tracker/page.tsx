import { Metadata } from "next"
import VacantSeatTrackerClient from "./tracker-client"
import {
  generateSeoMetadata,
  getBreadcrumbSchema,
  getFaqSchema,
} from "@/lib/seo-schemas"
import { JsonLd } from "@/components/json-ld"

export const metadata: Metadata = generateSeoMetadata({
  title: "MHT CET Vacant Seat Tracker 2026 | Live CAP Round Vacancies | AdmitWise",
  description: "Track live vacant seats in Maharashtra Engineering and Medical colleges across CAP rounds. Explore vacant seat counts category-wise, college-wise and branch-wise.",
  canonicalUrl: "https://admitwiseedu.com/vacant-seat-tracker",
  keywords: [
    "MHT CET Vacant Seat Tracker",
    "MHT CET CAP Round",
    "CAP Round Predictor",
    "CAP Round Vacancy",
    "Engineering Counselling",
    "Maharashtra Engineering Colleges",
    "AdmitWise",
  ],
})

export default function Page() {
  const breadcrumbs = getBreadcrumbSchema([
    { name: "Home", url: "https://admitwiseedu.com" },
    { name: "Vacant Seat Tracker", url: "https://admitwiseedu.com/vacant-seat-tracker" },
  ])

  const faqs = getFaqSchema([
    {
      question: "What is the MHT CET Vacant Seat Tracker?",
      answer: "The AdmitWise Vacant Seat Tracker tracks remaining vacant seats in Maharashtra engineering and medical colleges across various CAP rounds, categories, and branches.",
    },
    {
      question: "How does the Vacant Seat Tracker help in college admission counselling?",
      answer: "It allows students to find unfilled seats in their target branches and colleges during active CAP rounds, helping them optimize their college preference list.",
    },
  ])

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={faqs} />
      <VacantSeatTrackerClient />
    </>
  )
}
