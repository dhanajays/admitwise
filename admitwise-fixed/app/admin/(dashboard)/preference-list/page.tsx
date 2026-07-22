"use client"

import { useState, useEffect } from "react"
import {
  Upload,
  Database,
  CheckCircle,
  Clock,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  Layers,
  User,
  Calendar,
} from "lucide-react"

const ROUNDS = ["Round 1", "Round 2", "Round 3", "Round 4"]

export default function AdminPreferenceDatasetPage() {
  const [activeTab, setActiveTab] = useState("Round 1")
  const [datasets, setDatasets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const fetchDatasets = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/preference-dataset")
      if (res.ok) {
        const data = await res.json()
        setDatasets(data || [])
      }
    } catch (err) {
      console.error("Error fetching preference datasets:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDatasets()
  }, [])

  const currentDataset = datasets.find(
    (d) => d.round === activeTab && d.status === "Active"
  )
  const roundHistory = datasets.filter((d) => d.round === activeTab)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setErrorMsg(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMsg("Please select a CSV file to upload.")
      return
    }

    setUploading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("round", activeTab)

      const res = await fetch("/api/admin/preference-dataset", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to upload dataset.")
      }

      setSuccessMsg(`Successfully uploaded dataset Version for ${activeTab}!`)
      setSelectedFile(null)
      await fetchDatasets()
    } catch (err: any) {
      console.error("Upload error:", err)
      setErrorMsg(err.message || "Failed to upload dataset.")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dataset?")) return
    try {
      const res = await fetch(`/api/admin/preference-dataset?id=${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setSuccessMsg("Dataset deleted successfully.")
        await fetchDatasets()
      }
    } catch (err) {
      console.error("Delete error:", err)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Database className="h-6 w-6 text-blue-600" />
          Preference List Dataset Manager
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Upload and manage MHT CET PCM cutoff datasets per CAP Round for the AI Preference Generator.
        </p>
      </div>

      {/* Tabs for CAP Rounds */}
      <div className="flex border-b border-slate-200 space-x-2">
        {ROUNDS.map((round) => (
          <button
            key={round}
            onClick={() => {
              setActiveTab(round)
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition-all cursor-pointer ${
              activeTab === round
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {round} Dataset
          </button>
        ))}
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload / Replace Dataset Box */}
        <div className="glass-card rounded-2xl p-6 bg-white border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Upload className="h-4 w-4 text-blue-600" />
            {currentDataset ? `Replace ${activeTab} Dataset` : `Upload ${activeTab} Dataset`}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Upload CSV with columns: <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">college_code, college_name, branch_code, branch_name, status, home_university, seat_section, stage, category_code, gender, disability, defense_q, closing_rank, closing_percentile, city</code>
          </p>

          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center space-y-3 hover:border-blue-300 transition-colors">
            <FileSpreadsheet className="h-8 w-8 text-slate-400 mx-auto" />
            <div>
              <input
                type="file"
                accept=".csv"
                id="csv-upload"
                className="hidden"
                onChange={handleFileChange}
              />
              <label
                htmlFor="csv-upload"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                Browse CSV File
              </label>
            </div>
            {selectedFile && (
              <p className="text-xs font-semibold text-blue-600 truncate">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {uploading ? "Uploading & Processing..." : currentDataset ? `Replace Dataset (v${currentDataset.version + 1})` : "Upload Active Dataset"}
          </button>
        </div>

        {/* Right Columns: Active Dataset Details & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Dataset Status Card */}
          <div className="glass-card rounded-2xl p-6 bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                Active Dataset for {activeTab}
              </h3>
              {currentDataset && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  Version {currentDataset.version} • Active
                </span>
              )}
            </div>

            {currentDataset ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Rows</div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    {currentDataset.rowCount.toLocaleString()}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Columns</div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">15 Fields</div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Uploaded Date</div>
                  <div className="text-xs font-bold text-slate-800 mt-1 truncate">
                    {new Date(currentDataset.uploadedAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Uploaded By</div>
                  <div className="text-xs font-bold text-slate-800 mt-1 truncate">
                    {currentDataset.uploadedByUser?.name || "Admin"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No active dataset uploaded for {activeTab} yet. Please upload a CSV using the box on the left.
              </div>
            )}
          </div>

          {/* Dataset Version History */}
          <div className="glass-card rounded-2xl p-6 bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-slate-500" />
              {activeTab} Upload History
            </h3>

            {roundHistory.length === 0 ? (
              <div className="text-xs text-slate-400 italic">No history logs recorded.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {roundHistory.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        <span>Version {item.version}</span>
                        {item.status === "Active" ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400 text-[11px] flex items-center gap-3">
                        <span>{item.rowCount.toLocaleString()} rows</span>
                        <span>•</span>
                        <span>{new Date(item.uploadedAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Delete Dataset Version"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
