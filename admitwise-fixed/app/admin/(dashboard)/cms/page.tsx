"use client"

import { useEffect, useState } from "react"
import {
  FileCode,
  Sparkles,
  Mail,
  HelpCircle,
  Link as LinkIcon,
  Loader2,
  Plus,
  Trash2,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function CmsEditorPage() {
  const [activeTab, setActiveTab] = useState<"hero" | "about" | "contact" | "faq" | "footer">("hero")
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)

  // ── Form States ───────────────────────────────────────────────────────────
  // Hero
  const [heroTitle, setHeroTitle] = useState("")
  const [heroSubtitle, setHeroSubtitle] = useState("")
  const [heroDesc, setHeroDesc] = useState("")
  const [heroBadge, setHeroBadge] = useState("")
  const [heroCtaP, setHeroCtaP] = useState("")
  const [heroCtaC, setHeroCtaC] = useState("")

  // About
  const [aboutHeading, setAboutHeading] = useState("")
  const [aboutDesc, setAboutDesc] = useState("")
  const [aboutStats, setAboutStats] = useState<any[]>([])

  // Contact
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [contactAddress, setContactAddress] = useState("")
  const [contactHours, setContactHours] = useState("")

  // FAQ
  const [faqs, setFaqs] = useState<any[]>([])

  // Footer
  const [footerCopyright, setFooterCopyright] = useState("")
  const [footerTagline, setFooterTagline] = useState("")
  const [fbLink, setFbLink] = useState("")
  const [igLink, setIgLink] = useState("")
  const [twLink, setTwLink] = useState("")
  const [liLink, setLiLink] = useState("")

  useEffect(() => {
    loadAllCmsData()
  }, [])

  async function loadAllCmsData() {
    setLoading(true)
    try {
      // Load Hero
      const resHero = await fetch("/api/cms?key=hero")
      if (resHero.ok) {
        const data = await resHero.json()
        if (data.value) {
          const val = JSON.parse(data.value)
          setHeroTitle(val.title || "")
          setHeroSubtitle(val.subtitle || "")
          setHeroDesc(val.description || "")
          setHeroBadge(val.badgeText || "")
          setHeroCtaP(val.ctaPredict || "")
          setHeroCtaC(val.ctaCounselling || "")
        }
      }

      // Load About
      const resAbout = await fetch("/api/cms?key=about")
      if (resAbout.ok) {
        const data = await resAbout.json()
        if (data.value) {
          const val = JSON.parse(data.value)
          setAboutHeading(val.heading || "")
          setAboutDesc(val.description || "")
          setAboutStats(val.stats || [])
        }
      }

      // Load Contact
      const resContact = await fetch("/api/cms?key=contact")
      if (resContact.ok) {
        const data = await resContact.json()
        if (data.value) {
          const val = JSON.parse(data.value)
          setContactEmail(val.email || "")
          setContactPhone(val.phone || "")
          setContactAddress(val.address || "")
          setContactHours(val.businessHours || "")
        }
      }

      // Load FAQ
      const resFaq = await fetch("/api/cms?key=faq")
      if (resFaq.ok) {
        const data = await resFaq.json()
        if (data.value) {
          setFaqs(JSON.parse(data.value) || [])
        }
      }

      // Load Footer
      const resFooter = await fetch("/api/cms?key=footer")
      if (resFooter.ok) {
        const data = await resFooter.json()
        if (data.value) {
          const val = JSON.parse(data.value)
          setFooterCopyright(val.copyright || "")
          setFooterTagline(val.tagline || "")
          setFbLink(val.facebook || "")
          setIgLink(val.instagram || "")
          setTwLink(val.twitter || "")
          setLiLink(val.linkedin || "")
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(key: string, value: any) {
    setSaveLoading(true)
    try {
      const res = await fetch("/api/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      })
      if (res.ok) {
        alert("Section updated successfully!")
      } else {
        alert("Failed to update section")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaveLoading(false)
    }
  }

  function handleSaveHero(e: React.FormEvent) {
    e.preventDefault()
    handleSave("hero", {
      title: heroTitle,
      subtitle: heroSubtitle,
      description: heroDesc,
      badgeText: heroBadge,
      ctaPredict: heroCtaP,
      ctaCounselling: heroCtaC,
    })
  }

  function handleSaveAbout(e: React.FormEvent) {
    e.preventDefault()
    handleSave("about", {
      heading: aboutHeading,
      description: aboutDesc,
      stats: aboutStats,
    })
  }

  function handleSaveContact(e: React.FormEvent) {
    e.preventDefault()
    handleSave("contact", {
      email: contactEmail,
      phone: contactPhone,
      address: contactAddress,
      businessHours: contactHours,
    })
  }

  function handleSaveFaq(e: React.FormEvent) {
    e.preventDefault()
    handleSave("faq", faqs)
  }

  function handleSaveFooter(e: React.FormEvent) {
    e.preventDefault()
    handleSave("footer", {
      copyright: footerCopyright,
      tagline: footerTagline,
      facebook: fbLink,
      instagram: igLink,
      twitter: twLink,
      linkedin: liLink,
    })
  }

  function handleAddFaq() {
    setFaqs((prev) => [...prev, { question: "", answer: "" }])
  }

  function handleRemoveFaq(index: number) {
    setFaqs((prev) => prev.filter((_, i) => i !== index))
  }

  function handleFaqChange(index: number, field: "question" | "answer", val: string) {
    setFaqs((prev) => {
      const next = [...prev]
      next[index][field] = val
      return next
    })
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Website Settings (CMS)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Modify landing page layout content and metadata values without rewriting code.
        </p>
      </div>

      {/* Editor layout */}
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        {/* Navigation Tabs sidebar */}
        <div className="flex flex-col gap-1 rounded-xl bg-card border border-border p-2 h-fit shadow-sm">
          <TabButton active={activeTab === "hero"} onClick={() => setActiveTab("hero")} label="Homepage Hero" icon={Sparkles} />
          <TabButton active={activeTab === "about"} onClick={() => setActiveTab("about")} label="About Page" icon={FileCode} />
          <TabButton active={activeTab === "contact"} onClick={() => setActiveTab("contact")} label="Contact details" icon={Mail} />
          <TabButton active={activeTab === "faq"} onClick={() => setActiveTab("faq")} label="Faqs" icon={HelpCircle} />
          <TabButton active={activeTab === "footer"} onClick={() => setActiveTab("footer")} label="Footer" icon={LinkIcon} />
        </div>

        {/* Form container */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {/* 1. Hero Form */}
          {activeTab === "hero" && (
            <form onSubmit={handleSaveHero} className="space-y-4 text-xs">
              <h2 className="font-heading text-base font-bold text-foreground mb-4">Homepage Hero Content</h2>
              
              <div className="space-y-1.5">
                <Label htmlFor="heroBadge">Badge text (top snippet)</Label>
                <Input id="heroBadge" value={heroBadge} onChange={(e) => setHeroBadge(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="heroTitle">Primary Heading Title</Label>
                <Input id="heroTitle" required value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="heroSubtitle">Heading Subtitle</Label>
                <Input id="heroSubtitle" value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="heroDesc">Hero Subdescription</Label>
                <textarea
                  id="heroDesc"
                  required
                  rows={4}
                  value={heroDesc}
                  onChange={(e) => setHeroDesc(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="heroCtaP">Predictor CTA Button Label</Label>
                  <Input id="heroCtaP" required value={heroCtaP} onChange={(e) => setHeroCtaP(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="heroCtaC">Counselling CTA Button Label</Label>
                  <Input id="heroCtaC" required value={heroCtaC} onChange={(e) => setHeroCtaC(e.target.value)} />
                </div>
              </div>

              <Button type="submit" disabled={saveLoading} className="mt-6 flex items-center gap-1.5">
                {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Hero Section
              </Button>
            </form>
          )}

          {/* 2. About Form */}
          {activeTab === "about" && (
            <form onSubmit={handleSaveAbout} className="space-y-4 text-xs">
              <h2 className="font-heading text-base font-bold text-foreground mb-4">About Us Section</h2>

              <div className="space-y-1.5">
                <Label htmlFor="aboutHeading">About Section Heading</Label>
                <Input id="aboutHeading" required value={aboutHeading} onChange={(e) => setAboutHeading(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="aboutDesc">About Section Description</Label>
                <textarea
                  id="aboutDesc"
                  required
                  rows={5}
                  value={aboutDesc}
                  onChange={(e) => setAboutDesc(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <Button type="submit" disabled={saveLoading} className="mt-6 flex items-center gap-1.5">
                {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save About Section
              </Button>
            </form>
          )}

          {/* 3. Contact Details Form */}
          {activeTab === "contact" && (
            <form onSubmit={handleSaveContact} className="space-y-4 text-xs">
              <h2 className="font-heading text-base font-bold text-foreground mb-4">Contact Information</h2>

              <div className="space-y-1.5">
                <Label htmlFor="contactEmail">Email Address</Label>
                <Input id="contactEmail" type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contactPhone">Phone Number</Label>
                <Input id="contactPhone" required value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contactAddress">Office Address</Label>
                <Input id="contactAddress" required value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contactHours">Business Hours</Label>
                <Input id="contactHours" required value={contactHours} onChange={(e) => setContactHours(e.target.value)} />
              </div>

              <Button type="submit" disabled={saveLoading} className="mt-6 flex items-center gap-1.5">
                {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Contact Details
              </Button>
            </form>
          )}

          {/* 4. FAQ Form */}
          {activeTab === "faq" && (
            <form onSubmit={handleSaveFaq} className="space-y-6 text-xs">
              <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
                <h2 className="font-heading text-base font-bold text-foreground">Frequently Asked Questions</h2>
                <Button type="button" size="sm" onClick={handleAddFaq} className="flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add FAQ
                </Button>
              </div>

              {faqs.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground text-sm">No FAQs configured. Add one using the button above.</p>
              ) : (
                <div className="space-y-4 divide-y divide-border/60">
                  {faqs.map((faq, i) => (
                    <div key={i} className="pt-4 first:pt-0 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded bg-secondary/80 px-2 py-0.5 text-xxs font-bold uppercase mt-1">FAQ #{i + 1}</span>
                        <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveFaq(i)} className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`q-${i}`}>Question</Label>
                        <Input
                          id={`q-${i}`}
                          required
                          placeholder="Type question here..."
                          value={faq.question}
                          onChange={(e) => handleFaqChange(i, "question", e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`a-${i}`}>Answer</Label>
                        <textarea
                          id={`a-${i}`}
                          required
                          rows={3}
                          placeholder="Type answer here..."
                          value={faq.answer}
                          onChange={(e) => handleFaqChange(i, "answer", e.target.value)}
                          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button type="submit" disabled={saveLoading || faqs.length === 0} className="mt-6 flex items-center gap-1.5">
                {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save FAQ Configurations
              </Button>
            </form>
          )}

          {/* 5. Footer Form */}
          {activeTab === "footer" && (
            <form onSubmit={handleSaveFooter} className="space-y-4 text-xs">
              <h2 className="font-heading text-base font-bold text-foreground mb-4">Footer Tagline & Social Links</h2>

              <div className="space-y-1.5">
                <Label htmlFor="footerTagline">Tagline tagline text</Label>
                <Input id="footerTagline" required value={footerTagline} onChange={(e) => setFooterTagline(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="footerCopyright">Copyright notice string</Label>
                <Input id="footerCopyright" required value={footerCopyright} onChange={(e) => setFooterCopyright(e.target.value)} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fbLink">Facebook URL</Label>
                  <Input id="fbLink" placeholder="https://..." value={fbLink} onChange={(e) => setFbLink(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="igLink">Instagram URL</Label>
                  <Input id="igLink" placeholder="https://..." value={igLink} onChange={(e) => setIgLink(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="twLink">Twitter URL</Label>
                  <Input id="twLink" placeholder="https://..." value={twLink} onChange={(e) => setTwLink(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="liLink">LinkedIn URL</Label>
                  <Input id="liLink" placeholder="https://..." value={liLink} onChange={(e) => setLiLink(e.target.value)} />
                </div>
              </div>

              <Button type="submit" disabled={saveLoading} className="mt-6 flex items-center gap-1.5">
                {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Footer Section
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: any
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${
        active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </button>
  )
}
