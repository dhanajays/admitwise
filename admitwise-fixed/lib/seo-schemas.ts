import { Metadata } from "next"

export const baseMetadata: Metadata = {
  metadataBase: new URL("https://admitwiseedu.com"),
  authors: [{ name: "AdmitWise Team", url: "https://admitwiseedu.com" }],
  creator: "AdmitWise",
  publisher: "AdmitWise",
  applicationName: "AdmitWise",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export function generateSeoMetadata(options: {
  title: string
  description: string
  canonicalUrl: string
  keywords: string[]
}): Metadata {
  return {
    ...baseMetadata,
    title: options.title,
    description: options.description,
    keywords: options.keywords,
    alternates: {
      canonical: options.canonicalUrl,
    },
    openGraph: {
      title: options.title,
      description: options.description,
      url: options.canonicalUrl,
      type: "website",
      siteName: "AdmitWise",
      images: [
        {
          url: "https://admitwiseedu.com/images/og-image.png",
          width: 1200,
          height: 630,
          alt: options.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: options.title,
      description: options.description,
      images: ["https://admitwiseedu.com/images/og-image.png"],
    },
  }
}

// JSON-LD structured data generators
export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": "https://admitwiseedu.com/#organization",
    "name": "AdmitWise",
    "url": "https://admitwiseedu.com",
    "logo": "https://admitwiseedu.com/images/logo.png",
    "description": "India's leading AI-powered college admission predictor and counselling guidance platform for MHT CET Engineering and Medical aspirants.",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+91-9209568186",
      "contactType": "customer support",
      "email": "admitwisehelp@gmail.com",
      "areaServed": "IN",
      "availableLanguage": ["English", "Hindi", "Marathi"]
    },
    "sameAs": [
      "https://facebook.com/admitwise",
      "https://twitter.com/admitwise",
      "https://instagram.com/admitwise"
    ]
  }
}

export function getWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://admitwiseedu.com/#website",
    "name": "AdmitWise",
    "url": "https://admitwiseedu.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://admitwiseedu.com/predictor?search={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  }
}

export function getWebApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": "https://admitwiseedu.com/predictor/#webapp",
    "name": "AdmitWise College Predictor",
    "url": "https://admitwiseedu.com/predictor",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "All",
    "browserRequirements": "Requires JavaScript. Requires HTML5.",
    "featureList": [
      "AI MHT CET College Chance Prediction",
      "Category & Quota Custom Cutoffs Mapping",
      "Live CAP Round Vacant Seats Tracker"
    ]
  }
}

export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  }
}

export function getFaqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  }
}
