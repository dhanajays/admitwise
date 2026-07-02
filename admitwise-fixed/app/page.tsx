import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Hero } from "@/components/home/hero"
import { Stats } from "@/components/home/stats"
import { Services } from "@/components/home/services"
import { Process } from "@/components/home/process"
import { Testimonials } from "@/components/home/testimonials"
import { FaqCta } from "@/components/home/faq-cta"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
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
