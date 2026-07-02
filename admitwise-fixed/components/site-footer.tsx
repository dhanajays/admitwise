import Link from "next/link"
import { Mail, MapPin, Phone } from "lucide-react"

const columns = [
  {
    title: "Platform",
    links: [
      { href: "/predictor", label: "College Predictor" },
      { href: "/vacant-seat-tracker", label: "Vacant Seat Tracker" },
      { href: "/plans", label: "Counselling Plans" },
      { href: "/about", label: "About Us" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Streams",
    links: [
      { href: "/predictor", label: "Engineering (MHT-CET / JEE)" },
      { href: "/predictor", label: "Medical (NEET)" },
      { href: "/plans", label: "Study Abroad" },
      { href: "/plans", label: "Scholarships" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/about", label: "How It Works" },
      { href: "/about", label: "Success Stories" },
      { href: "/contact", label: "FAQ" },
      { href: "/about", label: "Disclaimer" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-500 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute -bottom-48 -left-48 h-96 w-96 rounded-full bg-blue-500/5 filter blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 relative z-10">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 group">
              <img
                src="/images/logo.png"
                alt="AdmitWise Logo"
                className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </Link>
            <p className="mt-4 max-w-sm text-pretty text-sm leading-relaxed text-slate-500/90">
              Smart Guidance. Better Admissions. India&apos;s data-driven admission guidance platform for Engineering
              and Medical aspirants.
            </p>
            <div className="mt-6 space-y-3 text-sm">
              <p className="flex items-center gap-2.5 text-slate-500 hover:text-blue-600 transition duration-300">
                <Mail className="h-4 w-4 text-blue-500" /> admitwisehelp@gmail.com
              </p>
              <p className="flex items-center gap-2.5 text-slate-500 hover:text-blue-600 transition duration-300">
                <Phone className="h-4 w-4 text-blue-500" /> +91 9209568186
              </p>
              <p className="flex items-center gap-2.5 text-slate-500 hover:text-blue-600 transition duration-300">
                <MapPin className="h-4 w-4 text-blue-500" /> Pune, Maharashtra, India
              </p>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-slate-900">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-500/85 transition-colors duration-300 hover:text-blue-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-slate-200 pt-8">
          <p className="text-xs leading-relaxed text-slate-400">
            Founded by a COEP Technological University Data Science student with the vision of making admission guidance
            transparent, personalized, and data-driven. AdmitWise provides predictions based on historical cutoff data
            for guidance purposes only and does not guarantee admission.
          </p>
          <p className="mt-4 text-xs text-slate-400">
            &copy; {new Date().getFullYear()} AdmitWise. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
