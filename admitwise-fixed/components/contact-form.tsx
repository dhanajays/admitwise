"use client"

import { useState } from "react"
import { CheckCircle2, Send, Loader2, AlertCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const topics = ["College Prediction Help", "Book 1:1 Counselling", "Detailed Report", "Study Abroad", "Other"]

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [topic, setTopic] = useState(topics[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const payload = {
      name: formData.get("name"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      subject: topic,
      message: formData.get("message"),
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setSubmitted(true)
      } else {
        const data = await res.json()
        setError(data.error || "Failed to submit message. Please try again.")
      }
    } catch (err) {
      setError("Something went wrong. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-md max-w-lg mx-auto">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h3 className="mt-4 font-heading text-xl font-bold text-slate-900">Thanks for reaching out!</h3>
        <p className="mt-2 text-xs text-slate-500">
          Our counselling team will get back to you within one business day.
        </p>
        <button 
          className="mt-6 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-6 py-2 text-xs font-semibold text-slate-700 transition" 
          onClick={() => setSubmitted(false)}
        >
          Send another message
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-semibold text-slate-650">Full name</Label>
          <input 
            id="name" 
            name="name" 
            required 
            placeholder="Your name" 
            disabled={loading} 
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs font-semibold text-slate-655">Phone</Label>
          <input 
            id="phone" 
            name="phone" 
            type="tel" 
            required 
            placeholder="+91 ..." 
            disabled={loading} 
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="email" className="text-xs font-semibold text-slate-655">Email</Label>
          <input 
            id="email" 
            name="email" 
            type="email" 
            required 
            placeholder="you@example.com" 
            disabled={loading} 
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-semibold text-slate-655">What can we help with?</Label>
          <Select value={topic} onValueChange={(value) => value && setTopic(value)} disabled={loading}>
            <SelectTrigger className="border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white shadow-lg text-slate-800">
              {topics.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="message" className="text-xs font-semibold text-slate-655">Message</Label>
          <textarea
            id="message"
            name="message"
            rows={4}
            required
            placeholder="Tell us about your exam, percentile and what you need help with..."
            disabled={loading}
            className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-850 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-650">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button 
        type="submit" 
        disabled={loading}
        className="btn-premium flex items-center justify-center gap-2 py-3 px-8 text-xs font-semibold shadow-blue-500/10"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Send Message
          </>
        )}
      </button>
    </form>
  )
}
