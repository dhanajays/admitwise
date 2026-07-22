"use client"

import { useState, useMemo, useRef } from "react"
import { Search, Plus, Trash2, ArrowUp, ArrowDown, GripVertical } from "lucide-react"

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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter available options (excluding already selected ones to prevent duplicates)
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
    // Prevent duplicates
    if (selected.some((s) => s.toLowerCase() === item.toLowerCase())) {
      setSearchTerm("")
      setDropdownOpen(false)
      return
    }

    if (item.toUpperCase() === "ANY") {
      onChange(["ANY"])
    } else {
      // Remove ANY if specific item is selected
      const cleaned = selected.filter((s) => s.toUpperCase() !== "ANY")
      onChange([...cleaned, item])
    }

    // Instantly clear search & refocus input for rapid selection
    setSearchTerm("")
    setDropdownOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
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

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", index.toString())
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)
    if (draggedIndex === null || draggedIndex === dropIndex) return

    const updated = [...selected]
    const [movedItem] = updated.splice(draggedIndex, 1)
    updated.splice(dropIndex, 0, movedItem)

    setDraggedIndex(null)
    onChange(updated)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
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
            ref={inputRef}
            type="text"
            className="w-full rounded-xl border border-slate-200 bg-white/90 pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 shadow-xs transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setDropdownOpen(false)}
            />
            <div className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
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
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <span className="font-medium">{opt}</span>
                    <Plus className="h-3.5 w-3.5 text-slate-400 hover:text-blue-600" />
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Selected Items List with Priority Badges & Full Drag-and-Drop */}
      <div className="min-h-[60px] rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-2.5">
        {selected.length === 0 ? (
          <div className="flex h-12 items-center justify-center text-xs text-slate-400 italic">
            No priorities added yet. Search and select above.
          </div>
        ) : (
          <ul className="space-y-2">
            {selected.map((item, index) => {
              const isDragging = draggedIndex === index
              const isDragOver = dragOverIndex === index

              return (
                <li
                  key={`${item}-${index}`}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-between rounded-lg border bg-white px-3 py-2 shadow-2xs transition-all ${
                    isDragging ? "opacity-40 border-blue-400 bg-blue-50/50" : "border-slate-200/80 hover:border-blue-200"
                  } ${isDragOver && !isDragging ? "border-2 border-blue-500 bg-blue-50/30 scale-[1.01]" : ""}`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <GripVertical className="h-4 w-4 text-slate-400 shrink-0 cursor-grab active:cursor-grabbing hover:text-slate-600" />
                    {/* Priority Badge */}
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-2xs">
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
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === selected.length - 1}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
