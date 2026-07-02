import { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Hero } from "@/components/home/hero"
import { Stats } from "@/components/home/stats"
import { Services } from "@/components/home/services"
import { Process } from "@/components/home/process"
import { Testimonials } from "@/components/home/testimonials"
import { FaqCta } from "@/components/home/faq-cta"
import {
  generateSeoMetadata,
  getOrganizationSchema,
  getWebsiteSchema,
  getWebApplicationSchema,
  getBreadcrumbSchema,
} from "@/lib/seo-schemas"
import { JsonLd } from "@/components/json-ld"

export const metadata: Metadata = generateSeoMetadata({
  title: "MHT CET College Predictor 2026 | AI College Predictor | AdmitWise",
  description: "AdmitWise is India's leading AI-powered college admission predictor for MHT CET Engineering & Medical aspirants. Predict cutoff ranks, explore vacant seats, and get expert CAP Round counselling.",
  canonicalUrl: "https://admitwiseedu.com",
  keywords: [
    "MHT CET College Predictor",
    "AI College Predictor Maharashtra",
    "MHT CET Predictor",
    "MHT CET Cutoff Predictor",
    "Engineering College Predictor",
    "Medical College Predictor",
    "CAP Round Predictor",
    "Maharashtra Engineering Colleges",
    "Engineering Counselling",
    "Engineering best colleges",
    "Engineering Branches",
  ],
})

export default function HomePage() {
  const orgSchema = getOrganizationSchema()
  const siteSchema = getWebsiteSchema()
  const webAppSchema = getWebApplicationSchema()
  const breadcrumbSchema = getBreadcrumbSchema([{ name: "Home", url: "https://admitwiseedu.com" }])

  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={orgSchema} />
      <JsonLd data={siteSchema} />
      <JsonLd data={webAppSchema} />
      <JsonLd data={breadcrumbSchema} />
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Stats />
        <Services />
        <Process />
        <Testimonials />
        <FaqCta />
      </main>
      <SiteFooter />
    </div>
  )
}
