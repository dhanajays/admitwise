"use client"

import { useEffect, useState } from "react"
import {
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  Reply,
  Trash2,
  Search,
  MessageSquare,
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

export default function ContactManagerPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Selected message details
  const [selectedMsg, setSelectedMsg] = useState<any | null>(null)
  
  // Modals / forms state
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchMessages()
  }, [])

  async function fetchMessages() {
    setLoading(true)
    try {
      // Fetch messages from database via backend
      const res = await fetch("/api/admin/analytics") // Analytics API has general logs, let's fetch messages
      // Wait, let's look: where do we get the contact requests from?
      // Let's check: we can fetch from an endpoint. We don't have a direct /api/contact GET endpoint that lists all of them.
      // But wait! We can add a GET handler to `/api/contact/route.ts` that lists all of them if the user is admin!
      // Wait, let's check `/api/contact/route.ts` - we wrote only POST there.
      // Let's modify `/api/contact/route.ts` to support GET for admins!
      // This is extremely simple and clean.
    } catch (err) {
      console.error(err)
    }
    
    // For now, let's query a dedicated fetch function
    try {
      const res = await fetch("/api/admin/contact-requests") // Let's create an endpoint or update /api/contact
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      } else {
        // Fallback or empty
        setMessages([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleResolve(msgId: string) {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/contact/${msgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve" }),
      })
      if (res.ok) {
        await fetchMessages()
        setSelectedMsg((prev: any) => (prev?.id === msgId ? { ...prev, status: "Resolved" } : prev))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSendReply() {
    if (!selectedMsg || replyText.trim().length === 0) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/contact/${selectedMsg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", replyMessage: replyText }),
      })
      if (res.ok) {
        await fetchMessages()
        setSelectedMsg((prev: any) => (prev ? { ...prev, status: "Resolved", replyMessage: replyText } : null))
        setShowReplyModal(false)
        setReplyText("")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete(msgId: string) {
    if (!confirm("Are you sure you want to delete this inquiry?")) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/contact/${msgId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        await fetchMessages()
        if (selectedMsg?.id === msgId) setSelectedMsg(null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  // Filter messages
  const filteredMessages = messages.filter((m) => {
    const query = search.toLowerCase()
    const matchesSearch =
      (m.name || "").toLowerCase().includes(query) ||
      (m.email || "").toLowerCase().includes(query) ||
      (m.subject || "").toLowerCase().includes(query) ||
      (m.message || "").toLowerCase().includes(query)

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && m.status === "Pending") ||
      (statusFilter === "resolved" && m.status === "Resolved")

    return matchesSearch && matchesStatus
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* List Column */}
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Contact Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review submissions, resolve issues, and reply to students directly.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
            <Input
              placeholder="Search by sender, email, subject, message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={(value) => value && setStatusFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Inquiries</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Messages List / Grid */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground bg-card">
              <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-semibold">No inquiries found</p>
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => setSelectedMsg(msg)}
                className={`cursor-pointer rounded-2xl border bg-card p-5 shadow-sm hover:shadow transition-all ${
                  selectedMsg?.id === msg.id ? "border-accent ring-1 ring-accent/30" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-sm font-bold text-foreground truncate">{msg.subject}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      From: <span className="font-semibold">{msg.name}</span> ({msg.email})
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xxs font-semibold uppercase ${
                      msg.status === "Resolved" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {msg.status}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{msg.message}</p>
                <div className="mt-3 flex items-center justify-between text-xxs text-muted-foreground/70 font-medium">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(msg.createdAt).toLocaleDateString("en-IN")}</span>
                  {msg.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {msg.phone}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Details/Action Panel */}
      <div className="h-fit rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6 lg:sticky lg:top-24">
        {selectedMsg === null ? (
          <div className="py-20 text-center text-muted-foreground">
            <Mail className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
            <p className="text-sm font-semibold">Select an inquiry</p>
            <p className="text-xs mt-1">Click a contact request card to read the message and resolve or reply.</p>
          </div>
        ) : (
          <>
            <div>
              <span
                className={`rounded px-1.5 py-0.5 text-xxs font-bold uppercase ${
                  selectedMsg.status === "Resolved" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                }`}
              >
                {selectedMsg.status}
              </span>
              <h2 className="font-heading text-lg font-bold text-foreground mt-2">{selectedMsg.subject}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Submitted by <span className="font-semibold text-foreground">{selectedMsg.name}</span> on{" "}
                {new Date(selectedMsg.createdAt).toLocaleString("en-IN")}
              </p>
            </div>

            {/* Sender Contacts */}
            <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <a href={`mailto:${selectedMsg.email}`} className="font-semibold text-accent underline">
                  {selectedMsg.email}
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-semibold text-foreground">{selectedMsg.phone || "—"}</span>
              </div>
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Student Message</h3>
              <p className="rounded-xl border border-border bg-secondary/10 p-4 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                {selectedMsg.message}
              </p>
            </div>

            {/* Reply Log if resolved */}
            {selectedMsg.replyMessage && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-green-600">Our Reply</h3>
                <p className="rounded-xl border border-green-200 bg-green-50/30 p-4 text-xs leading-relaxed text-foreground whitespace-pre-wrap font-medium">
                  {selectedMsg.replyMessage}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</h3>
              <div className="flex gap-2">
                {selectedMsg.status === "Pending" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 flex items-center justify-center gap-1.5"
                    disabled={actionLoading}
                    onClick={() => handleResolve(selectedMsg.id)}
                  >
                    <CheckCircle className="h-4 w-4 text-green-600" /> Mark Resolved
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 flex items-center justify-center gap-1.5"
                  disabled={actionLoading}
                  onClick={() => setShowReplyModal(true)}
                >
                  <Reply className="h-4 w-4 text-blue-600" /> {selectedMsg.replyMessage ? "Reply Again" : "Send Reply"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                  disabled={actionLoading}
                  onClick={() => handleDelete(selectedMsg.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Reply Modal */}
      {showReplyModal && selectedMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-heading text-base font-bold text-foreground">Reply to Student Inbound</h3>
              <button onClick={() => setShowReplyModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded-lg">
              <span className="font-semibold text-foreground">Recipient:</span> {selectedMsg.name} &lt;{selectedMsg.email}&gt;
              <br/>
              <span className="font-semibold text-foreground">Subject:</span> Re: [AdmitWise] {selectedMsg.subject}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="replyText">Compose Email Response</Label>
              <textarea
                id="replyText"
                rows={8}
                required
                placeholder="Type your response to the student..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={actionLoading}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" disabled={actionLoading} onClick={() => setShowReplyModal(false)}>
                Cancel
              </Button>
              <Button disabled={actionLoading || replyText.trim().length === 0} onClick={handleSendReply}>
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Reply className="h-4 w-4" /> Send Reply Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
