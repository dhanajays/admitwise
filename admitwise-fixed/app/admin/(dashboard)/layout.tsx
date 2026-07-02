import { getAdminSession } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  MessageSquare,
  CreditCard,
  Database,
  FileCode,
  ClipboardList,
  LogOut,
  ChevronRight,
  Settings,
} from "lucide-react"

interface SidebarLink {
  href: string
  label: string
  icon: any
  roles: string[]
}

const sidebarLinks: SidebarLink[] = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    roles: ["Super Admin", "Manager", "Support Executive"],
  },
  {
    href: "/admin/students",
    label: "Student Manager",
    icon: Users,
    roles: ["Super Admin", "Manager", "Support Executive", "Counsellor"],
  },
  {
    href: "/admin/contact",
    label: "Contact requests",
    icon: MessageSquare,
    roles: ["Super Admin", "Manager", "Support Executive", "Counsellor"],
  },
  {
    href: "/admin/plans",
    label: "Plan Config",
    icon: CreditCard,
    roles: ["Super Admin", "Manager"],
  },
  {
    href: "/admin/datasets",
    label: "Dataset Manager",
    icon: Database,
    roles: ["Super Admin", "Manager"],
  },
  {
    href: "/admin/all-india",
    label: "All India Predictor",
    icon: Database,
    roles: ["Super Admin"],
  },
  {
    href: "/admin/vacant-seats",
    label: "Vacant Seat Tracker",
    icon: Database,
    roles: ["Super Admin", "Manager"],
  },
  {
    href: "/admin/cms",
    label: "CMS Editor",
    icon: FileCode,
    roles: ["Super Admin", "Manager"],
  },
  {
    href: "/admin/logs",
    label: "Audit Logs",
    icon: ClipboardList,
    roles: ["Super Admin", "Manager", "Support Executive"],
  },
  {
    href: "/admin/settings",
    label: "Account Settings",
    icon: Settings,
    roles: ["Super Admin"],
  },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Use the secure admin cookie session — completely separate from student NextAuth
  const adminSession = await getAdminSession()

  console.log(`[AdminLayout] Rendering dashboard layout. Session found: ${!!adminSession}`)

  if (!adminSession) {
    console.log(`[AdminLayout] Redirecting to /admin/login because adminSession is null.`)
    redirect("/admin/login")
  }

  const userRole = adminSession.role
  const allowedAdminRoles = ["Super Admin", "Manager", "Support Executive", "Counsellor"]

  console.log(`[AdminLayout] Admin role: ${userRole}, is allowed: ${allowedAdminRoles.includes(userRole)}`)

  if (!allowedAdminRoles.includes(userRole)) {
    console.log(`[AdminLayout] Redirecting to /admin/login because role "${userRole}" is not allowed.`)
    redirect("/admin/login")
  }

  const userFilteredLinks = sidebarLinks.filter((link) => link.roles.includes(userRole))

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-200 bg-white shadow-sm">
        {/* Sidebar Brand */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
          <Image
            src="/images/logo.png"
            alt="AdmitWise"
            width={110}
            height={32}
            className="h-7 w-auto object-contain"
            priority
          />
          <span className="rounded bg-blue-50 border border-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 uppercase tracking-wider">
            Admin
          </span>
        </div>

        {/* User Badge */}
        <div className="border-b border-slate-200 px-6 py-4">
          <p className="text-sm font-semibold text-slate-800 truncate">{adminSession.name || "Administrator"}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{userRole}</span>
          </div>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
          {userFilteredLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <link.icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-650 transition-colors" />
                <span>{link.label}</span>
              </div>
              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
            </Link>
          ))}
        </nav>

        {/* Logout bottom */}
        <div className="border-t border-slate-200 p-4">
          <form action="/api/auth/admin/login" method="DELETE">
            <Link
              href="/api/auth/admin/logout"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-red-650 hover:bg-red-50 hover:text-red-750 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign Out</span>
            </Link>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col pl-64">
        {/* Header bar */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-sm px-8 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <span>Admin Control Panel</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline underline-offset-4 decoration-2"
            >
              Back to main website
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
