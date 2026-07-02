"use client"

import { useEffect, useState } from "react"
import {
  CreditCard,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function PlanManagerPage() {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Payments setting state
  const [paymentsEnabled, setPaymentsEnabled] = useState(true)
  const [paymentsLoading, setPaymentsLoading] = useState(true)

  // Edit / Create Modal state
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<"create" | "edit">("create")
  const [actionLoading, setActionLoading] = useState(false)

  // Form values
  const [planId, setPlanId] = useState("")
  const [name, setName] = useState("")
  const [price, setPrice] = useState(0)
  const [description, setDescription] = useState("")
  const [maxProfiles, setMaxProfiles] = useState(1)
  const [featuresText, setFeaturesText] = useState("") // Newline separated bullet features
  const [isEnabled, setIsEnabled] = useState(true)

  useEffect(() => {
    fetchPlans()
    fetchPaymentSettings()
  }, [])

  async function fetchPaymentSettings() {
    try {
      const res = await fetch("/api/settings/payments")
      if (res.ok) {
        const data = await res.json()
        setPaymentsEnabled(data.paymentsEnabled)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setPaymentsLoading(false)
    }
  }

  async function handleTogglePayments(checked: boolean) {
    setPaymentsLoading(true)
    try {
      const res = await fetch("/api/settings/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentsEnabled: checked }),
      })
      if (res.ok) {
        setPaymentsEnabled(checked)
        setToast({ message: "Payment settings updated successfully!", type: "success" })
      } else {
        const err = await res.json()
        setToast({ message: err.error || "Failed to update payment settings", type: "error" })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setPaymentsLoading(false)
    }
  }

  async function fetchPlans() {
    setLoading(true)
    try {
      const res = await fetch("/api/plans")
      if (res.ok) {
        const data = await res.json()
        setPlans(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenEdit(plan: any) {
    setModalType("edit")
    setPlanId(plan.id)
    setName(plan.name)
    setPrice(plan.price)
    setDescription(plan.description)
    setMaxProfiles(plan.maxProfiles)
    setFeaturesText(plan.features.join("\n"))
    setIsEnabled(plan.isEnabled)
    setShowModal(true)
  }

  function handleOpenCreate() {
    setModalType("create")
    setPlanId("")
    setName("")
    setPrice(0)
    setDescription("")
    setMaxProfiles(1)
    setFeaturesText("")
    setIsEnabled(true)
    setShowModal(true)
  }

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault()
    setActionLoading(true)

    const featuresArray = featuresText
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0)

    const payload = {
      id: planId,
      name,
      price: Number(price),
      description,
      maxProfiles: Number(maxProfiles),
      features: featuresArray,
      isEnabled,
    }

    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setToast({ message: "Plan saved successfully!", type: "success" })
        await fetchPlans()
        setShowModal(false)
      } else {
        const err = await res.json()
        setToast({ message: err.error || "Failed to save plan", type: "error" })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Subscription Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure predictor plans, adjust prices, edit features, or disable active packages.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="flex items-center gap-2">
          <Plus className="h-4.5 w-4.5" /> Add New Plan
        </Button>
      </div>

      {/* Global Payment Settings */}
      <div className="rounded-2xl border border-slate-205 bg-white p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className={`flex h-2 w-2 rounded-full ${paymentsEnabled ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
            Enable Plan Purchase Settings
          </h2>
          <p className="text-xs text-slate-500 max-w-xl">
            When disabled, all plan checkouts, profile add-ons, and payment flows will be suspended.
            Students attempting to buy or upgrade plans will see a &quot;Temporarily Unavailable&quot; notification.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {paymentsLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={paymentsEnabled}
              disabled={paymentsLoading}
              onChange={(e) => handleTogglePayments(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Plans List Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/20 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-4 font-semibold">Plan Name</th>
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">Price (INR)</th>
                <th className="px-6 py-4 font-semibold">Allowed Profiles</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">No plans configured. Add one to start.</td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="text-foreground hover:bg-secondary/10 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold">{plan.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-sm">{plan.description}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{plan.id}</td>
                    <td className="px-6 py-4 font-semibold">₹{plan.price}</td>
                    <td className="px-6 py-4 font-medium">{plan.maxProfiles} slots</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xxs font-semibold uppercase ${
                          plan.isEnabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {plan.isEnabled ? (
                          <>
                            <CheckCircle className="h-3 w-3" /> Enabled
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" /> Disabled
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(plan)} className="flex items-center gap-1 border border-border bg-background hover:bg-secondary/40">
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleSavePlan} className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-heading text-base font-bold text-foreground">
                {modalType === "create" ? "Add New Subscription Plan" : "Edit Plan Configuration"}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="planId">Plan ID</Label>
                <Input
                  id="planId"
                  required
                  placeholder="e.g. single, premium"
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  disabled={modalType === "edit"}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  required
                  placeholder="e.g. Premium Support"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price">Price (INR)</Label>
                <Input
                  id="price"
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="maxProfiles">Max Saved Profiles</Label>
                <Input
                  id="maxProfiles"
                  type="number"
                  required
                  placeholder="e.g. 3"
                  value={maxProfiles}
                  onChange={(e) => setMaxProfiles(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="description">Short Description</Label>
                <Input
                  id="description"
                  required
                  placeholder="Summarize the plan purpose..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="features">Plan Features (One per line)</Label>
                <textarea
                  id="features"
                  required
                  rows={6}
                  placeholder="1 Percentile Profile&#10;Unlimited Predictions&#10;1:1 Counselling Help"
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="sm:col-span-2 rounded-xl border border-border bg-secondary/30 p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">Enable Plan Option</p>
                  <p className="text-xxs text-muted-foreground mt-0.5">Toggle off to temporarily disable purchase checkouts</p>
                </div>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="h-4.5 w-4.5 accent-[var(--accent)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="outline" disabled={actionLoading} onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3.5 shadow-2xl backdrop-blur-xl transition-all duration-300">
          <div className={`h-2.5 w-2.5 rounded-full ${toast.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`} />
          <span className="text-sm font-medium text-slate-800">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
