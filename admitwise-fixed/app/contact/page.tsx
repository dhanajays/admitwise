import { Metadata } from "next"
import { Clock, Mail, MapPin, Phone, Sparkles } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ContactForm } from "@/components/contact-form"
import { Reveal } from "@/components/reveal"
import { generateSeoMetadata, getBreadcrumbSchema } from "@/lib/seo-schemas"
import { JsonLd } from "@/components/json-ld"

export const metadata: Metadata = generateSeoMetadata({
  title: "Contact AdmitWise Counselling | Get Expert Admissions Guidance",
  description: "Contact the AdmitWise team for MHT CET admission guidance, college prediction reports, and custom counselling support. We are here to answer your queries.",
  canonicalUrl: "https://admitwiseedu.com/contact",
  keywords: [
    "Contact AdmitWise",
    "MHT CET Admission counselling support",
    "Maharashtra college predictor contact",
  ],
})

const details = [
  { icon: Mail, label: "Email", value: "admitwisehelp@gmail.com" },
  { icon: Phone, label: "Phone", value: "+91 9209568186" },
  { icon: MapPin, label: "Office", value: "Pune, Maharashtra, India" },
  { icon: Clock, label: "Hours", value: "Mon–Sat, 10am – 7pm IST" },
]

export default function ContactPage() {
  const breadcrumbs = getBreadcrumbSchema([
    { name: "Home", url: "https://admitwiseedu.com" },
    { name: "Contact", url: "https://admitwiseedu.com/contact" },
  ])

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <JsonLd data={breadcrumbs} />
      <SiteHeader />
      <main className="flex-1 bg-white">
        <section className="relative overflow-hidden border-b border-slate-200/50 bg-[#f8fafc] py-16">
          {/* Ambient background glows */}
          <div className="pointer-events-none absolute left-1/4 top-1/4 h-[300px] w-[300px] rounded-full bg-blue-500/5 filter blur-[100px]" />

          <div className="relative z-10 mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wide mb-5">
              <Sparkles className="h-3.5 w-3.5" /> Support Desk
            </span>
            <h1 className="font-heading text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl text-gradient">
              Let&apos;s talk admissions
            </h1>
            <p className="mt-3 max-w-2xl text-pretty text-slate-500 text-sm leading-relaxed">
              Have a question about your predictions or want expert 1:1 guidance? Our counselling team is here to help.
            </p>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-screen-2xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-12">
            <Reveal>
              <div className="glass-card rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-sm p-6 shadow-md">
                <ContactForm />
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="space-y-4">
                {details.map((d) => (
                  <div
                    key={d.label}
                    className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition duration-300"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
                      <d.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{d.label}</p>
                      <p className="font-semibold text-slate-900 text-sm mt-0.5">{d.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
