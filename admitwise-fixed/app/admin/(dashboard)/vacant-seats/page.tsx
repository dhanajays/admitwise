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

import { CAP_ROUNDS } from "@/lib/master-config"

export default function VacantSeatDatasetManagerPage() {
  const [datasets, setDatasets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Upload states
  const [year, setYear] = useState(new Date().getFullYear())
  const [exam, setExam] = useState("MHT CET PCM")
  const [round, setRound] = useState("Round 1")
  const [file, setFile] = useState<File | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)

  // Preview states
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
      const res = await fetch("/api/datasets/vacant-seats")
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
      const res = await fetch("/api/datasets/vacant-seats", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        setFile(null)
        // Reset file input
        const fileInput = document.getElementById("csvFile") as HTMLInputElement
        if (fileInput) fileInput.value = ""

        setToast({ message: "Vacant seat dataset uploaded successfully!", type: "success" })
        await fetchDatasets()
      } else {
        const err = await res.json()
        setToast({ message: err.error || "Failed to upload dataset", type: "error" })
      }
    } catch (err) {
      console.error(err)
      setToast({ message: "An unexpected error occurred during upload", type: "error" })
    } finally {
      setUploadLoading(false)
    }
  }

  async function handleToggleStatus(datasetId: string, currentStatus: string) {
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active"
    try {
      const res = await fetch("/api/datasets/vacant-seats", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: datasetId, status: nextStatus }),
      })
      if (res.ok) {
        setToast({ message: `Dataset status changed to ${nextStatus}`, type: "success" })
        await fetchDatasets()
      } else {
        const err = await res.json()
        setToast({ message: err.error || "Failed to update status", type: "error" })
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
      const res = await fetch(`/api/datasets/vacant-seats/preview?id=${dataset.id}`)
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
    if (!confirm("Are you sure you want to delete this dataset? All vacant seat rows will be erased permanently!")) return
    try {
      const res = await fetch(`/api/datasets/vacant-seats?id=${datasetId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setToast({ message: "Dataset deleted successfully", type: "success" })
        await fetchDatasets()
      } else {
        const err = await res.json()
        setToast({ message: err.error || "Failed to delete dataset", type: "error" })
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
          <h1 className="font-heading text-2xl font-bold text-slate-900">Vacant Seat Dataset Manager</h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload and activate the vacant seat matrix CSV file. Only one dataset per round remains Active.
          </p>
        </div>

        {/* Datasets Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4 font-semibold">Dataset Detail</th>
                  <th className="px-6 py-4 font-semibold">Row count</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Uploaded By</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                    </td>
                  </tr>
                ) : datasets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-normal">No datasets uploaded yet.</td>
                  </tr>
                ) : (
                  datasets.map((d) => (
                    <tr key={d.id} className="text-slate-800 hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">
                          {d.year} · {d.exam}
                        </p>
                        <p className="text-xs text-slate-400 font-semibold">{d.round}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-650">{d.rowCount.toLocaleString()} rows</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(d.id, d.status)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                            d.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                          }`}
                        >
                          {d.status === "Active" ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3.5 w-3.5" /> Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-700">{d.uploadedByUser?.name || "Admin"}</p>
                        <p className="text-[10px] text-slate-400">{new Date(d.uploadedAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg p-1.5"
                            onClick={() => handlePreview(d)}
                            title="Preview Records"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-750 hover:bg-red-50 rounded-lg p-1.5"
                            onClick={() => handleDelete(d.id)}
                            title="Delete Dataset"
                          >
                            <Trash2 className="h-4 w-4" />
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
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" /> Upload Matrix CSV
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Select round data to upload. Validates schema column headers automatically.
          </p>

          <form onSubmit={handleUpload} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Academic Year</Label>
              <Select value={year.toString()} onValueChange={(v) => v && setYear(parseInt(v, 10))}>
                <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                  <SelectItem value="2028">2028</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Entrance Exam</Label>
              <Select value={exam} onValueChange={(v) => v && setExam(v)}>
                <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="MHT CET PCM">MHT CET PCM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">CAP Admission Round</Label>
              <Select value={round} onValueChange={(v) => v && setRound(v)}>
                <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {CAP_ROUNDS.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Select Vacancy Matrix CSV File</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                required
                className="border-slate-200 bg-white text-slate-800 rounded-xl cursor-pointer"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0]
                  setFile(selectedFile || null)
                }}
              />
            </div>

            <Button
              type="submit"
              disabled={uploadLoading || !file}
              className="btn-premium w-full mt-2 py-2.5 flex items-center justify-center gap-2 rounded-full"
            >
              {uploadLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading dataset...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Upload Vacant Seats Matrix
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && selectedDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-5xl rounded-3xl border border-slate-200 bg-white shadow-2xl p-6 flex flex-col max-h-[85vh] animate-fade-in-up">
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute right-4 top-4 rounded-md p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <h2 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" /> Dataset Preview: {selectedDataset.year} · {selectedDataset.exam}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{selectedDataset.round} · Showing first 10 rows</p>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap">
                    <th className="px-4 py-3">Institute Code</th>
                    <th className="px-4 py-3">Institute Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Choice Code</th>
                    <th className="px-4 py-3">Course Name</th>
                    <th className="px-4 py-3">CAP Seats</th>
                    <th className="px-4 py-3">OPEN G</th>
                    <th className="px-4 py-3">OPEN L</th>
                    <th className="px-4 py-3">OBC G</th>
                    <th className="px-4 py-3">OBC L</th>
                    <th className="px-4 py-3">EWS</th>
                    <th className="px-4 py-3">TFWS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium whitespace-nowrap text-slate-750">
                  {previewLoading ? (
                    <tr>
                      <td colSpan={12} className="py-20 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                      </td>
                    </tr>
                  ) : previewRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-10 text-center text-slate-400 font-normal">No rows found in this dataset.</td>
                    </tr>
                  ) : (
                    previewRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/40">
                        <td className="px-4 py-3 font-semibold">{r.instituteCode}</td>
                        <td className="px-4 py-3 max-w-[200px] truncate" title={r.instituteName}>{r.instituteName}</td>
                        <td className="px-4 py-3">{r.instituteType}</td>
                        <td className="px-4 py-3 font-mono">{r.choiceCode}</td>
                        <td className="px-4 py-3 max-w-[200px] truncate" title={r.courseName}>{r.courseName}</td>
                        <td className="px-4 py-3 text-center">{r.capSeats}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-905">{r.openG}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-905">{r.openL}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-905">{r.obcG}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-905">{r.obcL}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-905">{r.ewsSeats}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-905">{r.tfwsSeats}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => setShowPreviewModal(false)}
                className="rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-6 py-2"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Simple Toast Alerts */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-xl animate-fade-in-up">
          {toast.type === "success" ? (
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
          <span className="text-xs font-semibold text-slate-800">{toast.message}</span>
        </div>
      )}
    </div>
  )
}
