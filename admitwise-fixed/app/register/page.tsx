import { Metadata } from "next"
import RegisterClient from "./register-client"
import { generateSeoMetadata, getBreadcrumbSchema } from "@/lib/seo-schemas"
import { JsonLd } from "@/components/json-ld"

export const metadata: Metadata = generateSeoMetadata({
  title: "Create Your Account | Start MHT CET 2026 Counselling | AdmitWise",
  description: "Create an account on AdmitWise to start predicting engineering and medical college options, tracking live vacant seats, and receiving expert support.",
  canonicalUrl: "https://admitwiseedu.com/register",
  keywords: [
    "AdmitWise Register",
    "MHT CET Counselling Signup",
    "Maharashtra Engineering Admission Signup",
  ],
})

export default function Page() {
  const breadcrumbs = getBreadcrumbSchema([
    { name: "Home", url: "https://admitwiseedu.com" },
    { name: "Register", url: "https://admitwiseedu.com/register" },
  ])

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <RegisterClient />
    </>
  )
}
