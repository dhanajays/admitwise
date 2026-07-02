"use client"

import { useEffect, useState, useTransition } from "react"
import {
  Search,
  Users,
  UserCheck,
  UserX,
  CreditCard,
  Plus,
  Trash2,
  KeyRound,
  History,
  Lock,
  Loader2,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function StudentManagerPage() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // Detail panel state
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
  const [studentDetails, setStudentDetails] = useState<any | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  // Modals state
  const [modalType, setModalType] = useState<"suspend" | "plan" | "limit" | "password" | "delete" | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  
  // Form values
  const [newPlan, setNewPlan] = useState("single")
  const [newLimit, setNewLimit] = useState(1)
  const [newPassword, setNewPassword] = useState("")

  useEffect(() => {
    fetchStudents()
  }, [])

  async function fetchStudents() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/users")
      if (res.ok) {
        const data = await res.json()
        setStudents(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStudentDetails(userId: string) {
    setDetailsLoading(true)
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setStudentDetails(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setDetailsLoading(false)
    }
  }

  function handleSelectStudent(student: any) {
    setSelectedStudent(student)
    fetchStudentDetails(student.id)
  }

  async function handleExecuteAction() {
    if (!selectedStudent) return
    setActionLoading(true)
    try {
      let body: any = { userId: selectedStudent.id }
      
      if (modalType === "suspend") {
        body.action = "toggle_suspension"
        body.isSuspended = !selectedStudent.isSuspended
      } else if (modalType === "plan") {
        body.action = "upgrade_plan"
        body.planId = newPlan
      } else if (modalType === "limit") {
        body.action = "change_limit"
        body.limit = Number(newLimit)
      } else if (modalType === "password") {
        body.action = "reset_password"
        body.password = newPassword
      } else if (modalType === "delete") {
        // Delete request uses DELETE method
        const res = await fetch(`/api/admin/users?userId=${selectedStudent.id}`, {
          method: "DELETE",
        })
        if (res.ok) {
          setSelectedStudent(null)
          setStudentDetails(null)
          fetchStudents()
          setModalType(null)
        }
        setActionLoading(false)
        return
      }

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        // Refresh
        await fetchStudents()
        if (selectedStudent) {
          // Re-fetch details
          const updatedStudent = { ...selectedStudent }
          if (modalType === "suspend") updatedStudent.isSuspended = !selectedStudent.isSuspended
          if (modalType === "plan") {
            updatedStudent.currentPlan = newPlan
            if (newPlan === "premium") updatedStudent.profileLimit = 3
            if (newPlan === "elite") updatedStudent.profileLimit = 4
          }
          if (modalType === "limit") updatedStudent.profileLimit = Number(newLimit)
          setSelectedStudent(updatedStudent)
          fetchStudentDetails(selectedStudent.id)
        }
        setModalType(null)
        setNewPassword("")
      } else {
        const data = await res.json()
        alert(data.error || "Action failed")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  // Filter students
  const filteredStudents = students.filter((s) => {
    const query = search.toLowerCase()
    const matchesSearch =
      (s.name || "").toLowerCase().includes(query) ||
      (s.email || "").toLowerCase().includes(query) ||
      (s.mobile || "").toLowerCase().includes(query)

    const matchesPlan = planFilter === "all" || s.currentPlan === planFilter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "suspended" && s.isSuspended) ||
      (statusFilter === "active" && !s.isSuspended)

    return matchesSearch && matchesPlan && matchesStatus
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* List Column */}
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Student Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search students, manage plans, suspension, and inspect prediction logs.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={planFilter} onValueChange={(value) => value && setPlanFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="free">Free Tier</SelectItem>
              <SelectItem value="single">Single Predictor</SelectItem>
              <SelectItem value="premium">Premium CAP</SelectItem>
              <SelectItem value="elite">Elite Support</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value) => value && setStatusFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Students Table */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/20 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3 font-semibold">Name</th>
                  <th className="px-6 py-3 font-semibold">Email</th>
                  <th className="px-6 py-3 font-semibold">Phone Number</th>
                  <th className="px-6 py-3 font-semibold">Authentication Provider</th>
                  <th className="px-6 py-3 font-semibold">Registration Date</th>
                  <th className="px-6 py-3 font-semibold">Plan</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">No students matched.</td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      onClick={() => handleSelectStudent(student)}
                      className={`cursor-pointer hover:bg-secondary/20 transition-colors ${
                        selectedStudent?.id === student.id ? "bg-secondary/40" : ""
                      }`}
                    >
                      <td className="px-6 py-3.5">
                        <p className="font-semibold text-foreground">{student.name || "Unnamed Student"}</p>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-muted-foreground">
                        {student.email}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-muted-foreground">
                        {student.mobile || "Not Provided"}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-foreground font-medium">
                        {student.loginProvider === "google" ? "Google" : "Email"}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-muted-foreground">
                        {new Date(student.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-6 py-3.5 font-medium uppercase text-xs text-foreground">
                        {student.currentPlan}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xxs font-semibold uppercase ${
                            student.isSuspended ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                          }`}
                        >
                          {student.isSuspended ? "Suspended" : "Active"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Details/Action Panel */}
      <div className="h-fit rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6 lg:sticky lg:top-24">
        {selectedStudent === null ? (
          <div className="py-20 text-center text-muted-foreground">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
            <p className="text-sm font-semibold">Select a student</p>
            <p className="text-xs mt-1">Select a student in the table to inspect details and take administrative action.</p>
          </div>
        ) : (
          <>
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">{selectedStudent.name}</h2>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {selectedStudent.id}</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-secondary/40 p-3">
                <p className="text-xxs uppercase tracking-wider text-muted-foreground">Limit slots</p>
                <p className="mt-1 font-semibold text-foreground">
                  {selectedStudent.profilesUsed} / {selectedStudent.profileLimit} used
                </p>
              </div>
              <div className="rounded-xl bg-secondary/40 p-3">
                <p className="text-xxs uppercase tracking-wider text-muted-foreground">Provider</p>
                <p className="mt-1 font-semibold text-foreground capitalize">
                  {selectedStudent.loginProvider || "Credentials"}
                </p>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Admin Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setModalType("suspend")
                  }}
                  className="flex items-center gap-1.5 justify-start text-left"
                >
                  {selectedStudent.isSuspended ? (
                    <>
                      <UserCheck className="h-4 w-4 text-green-600" /> Activate
                    </>
                  ) : (
                    <>
                      <UserX className="h-4 w-4 text-red-600" /> Suspend
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewPlan(selectedStudent.currentPlan || "single")
                    setModalType("plan")
                  }}
                  className="flex items-center gap-1.5 justify-start text-left"
                >
                  <CreditCard className="h-4 w-4 text-blue-600" /> Change Plan
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewLimit(selectedStudent.profileLimit)
                    setModalType("limit")
                  }}
                  className="flex items-center gap-1.5 justify-start text-left"
                >
                  <Plus className="h-4 w-4 text-purple-600" /> Set Limit
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setModalType("password")
                  }}
                  className="flex items-center gap-1.5 justify-start text-left"
                >
                  <KeyRound className="h-4 w-4 text-yellow-600" /> Reset Pass
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setModalType("delete")
                  }}
                  className="col-span-2 flex items-center gap-1.5 justify-center bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" /> Delete Account
                </Button>
              </div>
            </div>

            {/* Subscriptions / Profiles / Predictions logs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" /> Recent Predictions
                </h3>
              </div>

              {detailsLoading ? (
                <div className="py-6 text-center">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : !studentDetails || !studentDetails.predictionHistories || studentDetails.predictionHistories.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No prediction runs found.</p>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-2.5">
                  {studentDetails.predictionHistories.map((h: any) => (
                    <div key={h.id} className="rounded-lg bg-secondary/20 p-2.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-foreground">
                          {h.exam} · {h.percentile}%
                        </p>
                        <span
                          className={`rounded px-1.5 py-0.5 text-xxs font-bold ${
                            h.chance === "Very High" || h.chance === "High"
                              ? "bg-green-100 text-green-700"
                              : h.chance === "Moderate"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {h.chance}
                        </span>
                      </div>
                      <p className="text-xxs text-muted-foreground mt-1 truncate">Branch: {h.branch}</p>
                      <p className="text-xxs text-muted-foreground">Cat: {h.category} · Rank: {h.closingRank || "—"}</p>
                      <p className="text-xxs text-muted-foreground/60 text-right mt-1">
                        {new Date(h.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Action Dialog / Modals */}
      {modalType !== null && selectedStudent !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="font-heading text-base font-bold text-foreground">
              {modalType === "suspend" && `${selectedStudent.isSuspended ? "Activate" : "Suspend"} Account`}
              {modalType === "plan" && "Upgrade Subscription Tier"}
              {modalType === "limit" && "Set Saved Profiles Limit"}
              {modalType === "password" && "Reset Student Credentials"}
              {modalType === "delete" && "Permanently Delete Student"}
            </h3>

            <p className="text-sm text-muted-foreground">
              {modalType === "suspend" &&
                `Are you sure you want to ${selectedStudent.isSuspended ? "activate" : "suspend"} user ${
                  selectedStudent.email
                }?`}
              {modalType === "delete" &&
                `WARNING: Deleting this account will permanently erase all subscription ledgers, prediction profiles, and prediction history files. This action is irreversible.`}
            </p>

            {modalType === "plan" && (
              <div className="space-y-1.5">
                <Label>Select Subscription Plan</Label>
                <Select value={newPlan} onValueChange={(value) => value && setNewPlan(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Predictor (₹499 - 1 slot)</SelectItem>
                    <SelectItem value="premium">Premium CAP Support (₹5000 - 3 slots)</SelectItem>
                    <SelectItem value="elite">Elite Admission Support (₹6000 - 4 slots)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {modalType === "limit" && (
              <div className="space-y-1.5">
                <Label>Allowed saved percentile profiles limit</Label>
                <Input
                  type="number"
                  min={0}
                  value={newLimit}
                  onChange={(e) => setNewLimit(Number(e.target.value))}
                />
              </div>
            )}

            {modalType === "password" && (
              <div className="space-y-1.5">
                <Label>Enter new temporary password</Label>
                <Input
                  type="text"
                  placeholder="minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={actionLoading}
                onClick={() => setModalType(null)}
              >
                Cancel
              </Button>
              <Button
                disabled={actionLoading}
                onClick={handleExecuteAction}
                className={`flex-1 ${modalType === "delete" ? "bg-red-600 text-white hover:bg-red-700" : ""}`}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing
                  </>
                ) : modalType === "delete" ? (
                  "Confirm Delete"
                ) : (
                  "Confirm"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
