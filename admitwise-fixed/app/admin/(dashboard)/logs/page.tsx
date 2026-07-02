"use client"

import { useEffect, useState } from "react"
import {
  ClipboardList,
  Search,
  Filter,
  Loader2,
  Terminal,
  Activity,
  User,
  Clock,
  Globe,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("all")

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/logs")
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Get unique actions for filter options
  const uniqueActions = ["all", ...new Set(logs.map((l) => l.action))]

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const query = search.toLowerCase()
    const matchesSearch =
      (log.details || "").toLowerCase().includes(query) ||
      (log.user?.name || "").toLowerCase().includes(query) ||
      (log.user?.email || "").toLowerCase().includes(query) ||
      (log.action || "").toLowerCase().includes(query)

    const matchesAction = actionFilter === "all" || log.action === actionFilter

    return matchesSearch && matchesAction
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-accent" /> System Audit Logs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Trace security audits, database actions, payments activity, and counsellor overrides.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
          <Input
            placeholder="Search logs by keyword, user, email or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={actionFilter} onValueChange={(value) => value && setActionFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Action Type" />
          </SelectTrigger>
          <SelectContent>
            {uniqueActions.map((action) => (
              <SelectItem key={action} value={action} className="capitalize">
                {action === "all" ? "All Actions" : action.toLowerCase().replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Logs Timeline */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No system activity logs match your filters.
          </div>
        ) : (
          <div className="relative border-l border-border pl-6 space-y-6 ml-3">
            {filteredLogs.map((log) => (
              <div key={log.id} className="relative">
                {/* Timeline Dot */}
                <span className="absolute -left-[31px] top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-secondary ring-4 ring-card text-muted-foreground">
                  <Terminal className="h-2.5 w-2.5" />
                </span>

                {/* Log card */}
                <div className="rounded-xl border border-border/80 bg-secondary/5 p-4 space-y-2.5 hover:shadow-xs transition-shadow">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded bg-accent/15 px-2 py-0.5 text-xxs font-bold text-accent uppercase tracking-wide">
                      {log.action}
                    </span>
                    <span className="text-xxs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "medium",
                      })}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-foreground">{log.details}</p>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground/80 font-medium">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      User: {log.user ? `${log.user.name} (${log.user.email})` : "System/Guest"}
                    </span>

                    {log.ipAddress && (
                      <span className="flex items-center gap-1 font-mono text-xxs">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        IP: {log.ipAddress}
                      </span>
                    )}

                    {log.device && (
                      <span className="text-xxs italic">
                        Device: {log.device}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
