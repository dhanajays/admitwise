import { Metadata } from "next"
import LoginClient from "./login-client"
import { generateSeoMetadata, getBreadcrumbSchema } from "@/lib/seo-schemas"
import { JsonLd } from "@/components/json-ld"

export const metadata: Metadata = generateSeoMetadata({
  title: "Sign In to Your Account | AdmitWise Counselling",
  description: "Sign in to your AdmitWise account to access the MHT CET College Predictor, manage saved tracker profiles, and view premium CAP Round reports.",
  canonicalUrl: "https://admitwiseedu.com/login",
  keywords: [
    "AdmitWise Login",
    "MHT CET Counselling",
    "Engineering Admissions",
    "Sign In AdmitWise",
  ],
})

export default function Page() {
  const breadcrumbs = getBreadcrumbSchema([
    { name: "Home", url: "https://admitwiseedu.com" },
    { name: "Login", url: "https://admitwiseedu.com/login" },
  ])

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <LoginClient />
    </>
  )
}
