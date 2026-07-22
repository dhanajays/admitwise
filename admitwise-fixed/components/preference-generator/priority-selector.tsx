"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Plus, Trash2, ArrowUp, ArrowDown, GripVertical, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface PrioritySelectorProps {
  label: string
  subtitle?: string
  options: string[]
  selected: string[]
  onChange: (newSelected: string[]) => void
  placeholder?: string
  defaultAnyOption?: boolean
}

export function PrioritySelector({
  label,
  subtitle,
  options,
  selected,
  onChange,
  placeholder = "Search and select...",
  defaultAnyOption = false,
}: PrioritySelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Filter available options (excluding already selected ones)
  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return options.filter((opt) => {
      const isSelected = selected.some((s) => s.toLowerCase() === opt.toLowerCase())
      if (isSelected) return false
      if (!term) return true
      return opt.toLowerCase().includes(term)
    })
  }, [options, selected, searchTerm])

  const handleAdd = (item: string) => {
    // If adding ANY, replace selection with ANY
    if (item.toUpperCase() === "ANY") {
      onChange(["ANY"])
    } else {
      // If ANY was present, remove it when adding specific item
      const cleaned = selected.filter((s) => s.toUpperCase() !== "ANY")
      onChange([...cleaned, item])
    }
    setSearchTerm("")
    setDropdownOpen(false)
  }

  const handleRemove = (index: number) => {
    const updated = [...selected]
    updated.splice(index, 1)
    if (updated.length === 0 && defaultAnyOption) {
      onChange(["ANY"])
    } else {
      onChange(updated)
    }
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...selected]
    const temp = updated[index]
    updated[index] = updated[index - 1]
    updated[index - 1] = temp
    onChange(updated)
  }

  const handleMoveDown = (index: number) => {
    if (index === selected.length - 1) return
    const updated = [...selected]
    const temp = updated[index]
    updated[index] = updated[index + 1]
    updated[index + 1] = temp
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-semibold text-slate-800">{label}</label>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <span className="text-xs font-medium text-slate-400">
          {selected.length} Selected
        </span>
      </div>

      {/* Search & Select Input Dropdown */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            className="w-full rounded-xl border border-slate-200 bg-white/90 pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setDropdownOpen(true)
            }}
            onFocus={() => setDropdownOpen(true)}
          />
        </div>

        {/* Floating Dropdown List */}
        <AnimatePresence>
          {dropdownOpen && (
            <>
              {/* Click backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
              >
                {filteredOptions.length === 0 ? (
                  <div className="px-4 py-3 text-center text-xs text-slate-400">
                    No matching options found
                  </div>
                ) : (
                  filteredOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleAdd(opt)}
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <span className="font-medium">{opt}</span>
                      <Plus className="h-3.5 w-3.5 text-slate-400 hover:text-blue-600" />
                    </button>
                  ))
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Items List with Priority Badges */}
      <div className="min-h-[60px] rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-2.5">
        {selected.length === 0 ? (
          <div className="flex h-12 items-center justify-center text-xs text-slate-400 italic">
            No priorities added yet. Search and select above.
          </div>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence>
              {selected.map((item, index) => (
                <motion.li
                  key={item + index}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-xs transition-all hover:border-blue-200"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <GripVertical className="h-4 w-4 text-slate-300 shrink-0 cursor-grab active:cursor-grabbing" />
                    {/* Priority Badge */}
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-xs">
                      {index + 1}
                    </span>
                    <span className="truncate text-xs font-semibold text-slate-800">
                      {item}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move Up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === selected.length - 1}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move Down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  )
}
