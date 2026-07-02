"use client"

import { X, AlertTriangle, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DisabledPaymentModalProps {
  onClose: () => void
}

export function DisabledPaymentModal({ onClose }: DisabledPaymentModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-fade-in-up">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:text-slate-600 transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center mt-2">
          {/* Warning Icon Container */}
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 border border-amber-100 mb-4 shadow-sm">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
          </span>

          <h2 className="font-heading text-lg font-bold text-slate-900 leading-tight">
            Purchases Temporarily Unavailable
          </h2>

          <p className="mt-3 text-xs text-slate-500 leading-relaxed max-w-sm">
            Online plan purchases are temporarily unavailable. Please try again later or contact support if you need urgent access.
          </p>

          {/* Quick contact / info panel */}
          <div className="w-full mt-5 rounded-xl border border-slate-100 bg-slate-50 p-3 flex items-center gap-3 text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <MessageSquare className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Contact Support</p>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">admitwisehelp@gmail.com</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-6 w-full">
            <Button
              className="w-full rounded-full py-2.5 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition"
              onClick={onClose}
            >
              Okay, I understand
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
