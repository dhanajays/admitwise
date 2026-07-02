import { Reveal } from "@/components/reveal"

const services = [
  {
    image: "/images/service-engineering.png",
    title: "Engineering Counselling",
    description:
      "MHT-CET, JEE and state CAP rounds decoded. Branch-wise predictions, college shortlists, and preference-list strategy.",
  },
  {
    image: "/images/service-medical.png",
    title: "Medical Counselling",
    description:
      "NEET UG guidance with category-aware MBBS/BDS predictions, government vs private analysis, and round planning.",
  },
  {
    image: "/images/service-abroad.png",
    title: "Study Abroad",
    description:
      "Explore international universities, shortlist by profile and budget, and get application and visa documentation help.",
  },
  {
    image: "/images/service-scholarship.png",
    title: "Scholarship Guidance",
    description:
      "Find scholarships you qualify for, plan finances, and submit strong applications with our advisory support.",
  },
]

export function Services() {
  return (
    <section className="relative bg-white py-20 lg:py-24 overflow-hidden">
      {/* Glow ambient background elements */}
      <div className="glow-blob -left-48 top-40 h-[450px] w-[450px] bg-blue-500/5" />
      <div className="glow-blob -right-48 bottom-40 h-[400px] w-[400px] bg-indigo-500/5" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            What we do
          </span>
          <h2 className="mt-3 text-balance font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-gradient">
            Guidance across every admission journey
          </h2>
          <p className="mt-4 text-sm text-slate-500 leading-relaxed">
            From entrance exam to enrolment, AdmitWise supports you with data-backed decisions at every step.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, i) => (
            <Reveal key={service.title} delay={i * 90}>
              <article className="glass-card glass-card-hover h-full overflow-hidden rounded-2xl bg-white/80 border-slate-200">
                <div className="aspect-[4/3] overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent z-10" />
                  <img
                    src={service.image}
                    alt={service.title}
                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                </div>
                <div className="p-6 relative z-20">
                  <h3 className="font-heading text-lg font-bold text-slate-900">
                    {service.title}
                  </h3>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-500">
                    {service.description}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
