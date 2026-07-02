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

export default function AllIndiaDatasetManagerPage() {
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
  const [round, setRound] = useState("Round I")
  const [file, setFile] = useState<File | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadSummary, setUploadSummary] = useState<{
    datasetName: string
    round: string
    fileName: string
    uploadDateTime: string
    importedCount: number
    invalidCount: number
    status: string
  } | null>(null)

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
      const res = await fetch("/api/admin/datasets/all-india")
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
    setUploadSummary(null)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("year", year.toString())
    formData.append("round", round)

    try {
      const res = await fetch("/api/admin/datasets/all-india", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setFile(null)
        // Reset file input
        const fileInput = document.getElementById("csvFile") as HTMLInputElement
        if (fileInput) fileInput.value = ""
        
        setToast({ message: "All India Dataset uploaded successfully!", type: "success" })
        setUploadSummary({
          datasetName: `${year} · All India Predictor`,
          round: round,
          fileName: file.name,
          uploadDateTime: new Date().toLocaleString("en-IN"),
          importedCount: data.rowCount,
          invalidCount: data.invalidCount || 0,
          status: "Active",
        })
        await fetchDatasets()
      } else {
        const err = await res.json()
        setToast({ message: err.error || "Failed to upload dataset", type: "error" })
      }
    } catch (err: any) {
      console.error(err)
      setToast({ message: err?.message || "Network Error: Failed to upload dataset. Check server logs.", type: "error" })
    } finally {
      setUploadLoading(false)
    }
  }

  async function handleToggleStatus(datasetId: string, currentStatus: string) {
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active"
    try {
      const res = await fetch("/api/admin/datasets/all-india", {
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
      const res = await fetch(`/api/admin/datasets/all-india/preview?id=${dataset.id}`)
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
      const res = await fetch(`/api/admin/datasets/all-india?id=${datasetId}`, {
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
          <h1 className="font-heading text-2xl font-bold text-foreground">All India Cutoff Dataset Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload and activate/deactivate CSV cutoffs for JEE, MHT CET, and NEET candidates.
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
                          {d.year} · All India Predictor
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
          Columns required: Round, Institute_Code, Institute_Name, Choice_Code, Course_Name, Merit_Exam, Admission_Type, Seat_Type, Closing_All_India_Merit, Closing_Percentile, Gender, Category, PWD, Defence, Home_University, Available_For_All_India.
        </p>

        {uploadSummary && (
          <div className="rounded-xl border border-emerald-250 bg-emerald-50/50 p-4 space-y-2.5 animate-fade-in text-xs font-semibold">
            <h3 className="font-heading font-bold text-emerald-800 text-sm flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-600" /> Upload Summary
            </h3>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
              <div>
                <p className="text-slate-400 text-[10px]">Dataset Name</p>
                <p>{uploadSummary.datasetName}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">CAP Round</p>
                <p>{uploadSummary.round}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">File Name</p>
                <p className="truncate" title={uploadSummary.fileName}>{uploadSummary.fileName}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Upload Date & Time</p>
                <p>{uploadSummary.uploadDateTime}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Imported Records</p>
                <p className="font-bold text-emerald-700">{uploadSummary.importedCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Invalid Records</p>
                <p className="font-bold text-rose-750">{uploadSummary.invalidCount}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-400 text-[10px]">Dataset Status</p>
                <p className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full uppercase">
                  {uploadSummary.status}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadSummary(null)}
              className="w-full text-slate-500 hover:text-slate-800 border-slate-200 mt-2 h-7"
            >
              Clear Summary
            </Button>
          </div>
        )}

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
            <Label>CAP Admission Round</Label>
            <Select value={round} onValueChange={(value) => value && setRound(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Round I">CAP Round I</SelectItem>
                <SelectItem value="Round II">CAP Round II</SelectItem>
                <SelectItem value="Round III">CAP Round III</SelectItem>
                <SelectItem value="Round IV">CAP Round IV</SelectItem>
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
                  Dataset Preview: {selectedDataset.year} · All India Predictor
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
                      <th className="px-4 py-2 font-semibold">Round</th>
                      <th className="px-4 py-2 font-semibold">Institute Name</th>
                      <th className="px-4 py-2 font-semibold">Course Name</th>
                      <th className="px-4 py-2 font-semibold">Exam</th>
                      <th className="px-4 py-2 font-semibold">Seat Type</th>
                      <th className="px-4 py-2 text-right">Percentile</th>
                      <th className="px-4 py-2 text-right">Merit Rank</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {previewRows.map((r, index) => (
                      <tr key={r.id || index} className="text-foreground hover:bg-secondary/20">
                        <td className="px-4 py-2 font-mono font-bold text-xxs">{r.round}</td>
                        <td className="px-4 py-2 max-w-[200px] truncate">{r.instituteName}</td>
                        <td className="px-4 py-2 max-w-[150px] truncate">{r.courseName}</td>
                        <td className="px-4 py-2">{r.meritExam}</td>
                        <td className="px-4 py-2">{r.seatType}</td>
                        <td className="px-4 py-2 text-right font-semibold text-accent">{r.closingPercentile}%</td>
                        <td className="px-4 py-2 text-right font-mono font-bold">{r.closingAllIndiaMerit.toLocaleString()}</td>
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
