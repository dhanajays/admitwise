"use client"

import { useEffect, useState } from "react"
import {
  Database,
  Upload,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  Layers,
  X,
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

export default function DatasetManagerPage() {
  const [datasets, setDatasets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Upload state
  const [year, setYear] = useState(new Date().getFullYear())
  const [exam, setExam] = useState("MHT CET PCM")
  const [round, setRound] = useState("Round 1")
  const [file, setFile] = useState<File | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)

  // Preview state
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [selectedDataset, setSelectedDataset] = useState<any | null>(null)

  useEffect(() => {
    fetchDatasets()
  }, [])

  async function fetchDatasets() {
    setLoading(true)
    try {
      const res = await fetch("/api/datasets")
      if (res.ok) {
        const data = await res.json()
        setDatasets(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setUploadLoading(true)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("year", year.toString())
    formData.append("exam", exam)
    formData.append("round", round)

    try {
      const res = await fetch("/api/datasets", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        setFile(null)
        // Reset file input
        const fileInput = document.getElementById("csvFile") as HTMLInputElement
        if (fileInput) fileInput.value = ""
        
        setToast({ message: "Dataset uploaded successfully!", type: "success" })
        await fetchDatasets()
      } else {
        const err = await res.json()
        setToast({ message: err.error || "Failed to upload dataset", type: "error" })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUploadLoading(false)
    }
  }

  async function handleToggleStatus(datasetId: string, currentStatus: string) {
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active"
    try {
      const res = await fetch("/api/datasets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: datasetId, status: nextStatus }),
      })
      if (res.ok) {
        await fetchDatasets()
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handlePreview(dataset: any) {
    setSelectedDataset(dataset)
    setShowPreviewModal(true)
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/datasets/preview?id=${dataset.id}`)
      if (res.ok) {
        const data = await res.json()
        setPreviewRows(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleDelete(datasetId: string) {
    if (!confirm("Are you sure you want to delete this dataset? All cutoff entries associated will be erased permanently!")) return
    try {
      const res = await fetch(`/api/datasets?id=${datasetId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        await fetchDatasets()
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* List Column */}
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Cutoff Dataset Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload new rounds cutoffs. Active status will instantly feed the predictor engine dynamically.
          </p>
        </div>

        {/* Datasets Table */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/20 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4 font-semibold">Dataset Detail</th>
                  <th className="px-6 py-4 font-semibold">Row count</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Uploaded By</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : datasets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">No datasets uploaded yet.</td>
                  </tr>
                ) : (
                  datasets.map((d) => (
                    <tr key={d.id} className="text-foreground hover:bg-secondary/10 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold">
                          {d.year} · {d.exam}
                        </p>
                        <p className="text-xs text-muted-foreground font-semibold">{d.round}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono">{d.rowCount.toLocaleString()} rows</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(d.id, d.status)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xxs font-semibold uppercase transition-colors ${
                            d.status === "Active"
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          {d.status === "Active" ? (
                            <>
                              <CheckCircle className="h-3 w-3" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" /> Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        <p>{d.uploadedByUser?.name || "System"}</p>
                        <p className="text-xxs">{new Date(d.uploadedAt).toLocaleDateString("en-IN")}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="ghost" size="sm" onClick={() => handlePreview(d)} className="flex items-center gap-1 border border-border bg-background hover:bg-secondary/40">
                            <Eye className="h-3.5 w-3.5" /> Preview
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(d.id)}
                            className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Upload Column */}
      <div className="h-fit rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5 lg:sticky lg:top-24">
        <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
          <Upload className="h-5 w-5 text-accent" /> Upload CSV
        </h2>
        <p className="text-xs text-muted-foreground">
          CSV columns must exactly match the template format to prevent importer failure.
        </p>

        <form onSubmit={handleUpload} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="year">Admission Year</Label>
            <Input
              id="year"
              type="number"
              required
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Exam Category</Label>
            <Select value={exam} onValueChange={(value) => value && setExam(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MHT CET PCM">MHT CET PCM</SelectItem>
                <SelectItem value="MHT CET PCB">MHT CET PCB</SelectItem>
                <SelectItem value="JEE Main">JEE Main</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>CAP Admission Round</Label>
            <Select value={round} onValueChange={(value) => value && setRound(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Round 1">CAP Round 1</SelectItem>
                <SelectItem value="Round 2">CAP Round 2</SelectItem>
                <SelectItem value="Round 3">CAP Round 3</SelectItem>
                <SelectItem value="Round 4">CAP Round 4</SelectItem>
                <SelectItem value="Spot Round">Spot Admission Round</SelectItem>
                <SelectItem value="Institute Level">Institute Level Round</SelectItem>
                <SelectItem value="Management Round">Management Seat Round</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="csvFile">Select CSV Data File</Label>
            <input
              id="csvFile"
              type="file"
              accept=".csv"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="flex w-full cursor-pointer rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm file:border-0 file:bg-transparent file:text-xs file:font-semibold file:text-foreground"
            />
          </div>

          <Button type="submit" className="w-full" disabled={uploadLoading || !file}>
            {uploadLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Importing CSV...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" /> Import Dataset
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && selectedDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-5xl rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-2 shrink-0">
              <div>
                <h3 className="font-heading text-base font-bold text-foreground">
                  Dataset Preview: {selectedDataset.year} · {selectedDataset.exam}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedDataset.round} (Showing first 10 rows)</p>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-border bg-secondary/10">
              {previewLoading ? (
                <div className="py-20 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : previewRows.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">No records to display.</div>
              ) : (
                <table className="w-full text-left text-xs font-medium">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30 text-xxs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2 font-semibold">Coll. Code</th>
                      <th className="px-4 py-2 font-semibold">College Name</th>
                      <th className="px-4 py-2 font-semibold">Branch Name</th>
                      <th className="px-4 py-2 font-semibold">Stage</th>
                      <th className="px-4 py-2 font-semibold">Category</th>
                      <th className="px-4 py-2 font-semibold">Gender</th>
                      <th className="px-4 py-2 font-semibold text-right">Percentile</th>
                      <th className="px-4 py-2 font-semibold text-right">Closing Rank</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {previewRows.map((r, index) => (
                      <tr key={r.id || index} className="text-foreground hover:bg-secondary/20">
                        <td className="px-4 py-2 font-mono font-bold text-xxs">{r.collegeCode}</td>
                        <td className="px-4 py-2 max-w-[200px] truncate">{r.collegeName}</td>
                        <td className="px-4 py-2 max-w-[150px] truncate">{r.branchName}</td>
                        <td className="px-4 py-2">{r.stage}</td>
                        <td className="px-4 py-2 font-bold">{r.category}</td>
                        <td className="px-4 py-2">{r.gender}</td>
                        <td className="px-4 py-2 text-right font-semibold text-accent">{r.closingPercentile}%</td>
                        <td className="px-4 py-2 text-right font-mono font-bold">{r.closingRank.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex justify-end pt-2 border-t border-border shrink-0">
              <Button onClick={() => setShowPreviewModal(false)}>Close Preview</Button>
            </div>
          </div>
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
