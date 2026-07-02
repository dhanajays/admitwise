"use client"

import { useEffect, useState, useRef } from "react"
import {
  User,
  Mail,
  Phone,
  Lock,
  Camera,
  Shield,
  Calendar,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AdminProfile {
  id: string
  name: string | null
  username: string | null
  email: string
  mobile: string | null
  image: string | null
  createdAt: string
  lastLogin: string | null
  role: string
}

export default function AdminSettingsPage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Notifications
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Profile Form State
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [mobile, setMobile] = useState("")
  const [image, setImage] = useState<string | null>(null)

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/profile")
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setName(data.name || "")
        setUsername(data.username || "")
        setEmail(data.email || "")
        setMobile(data.mobile || "")
        setImage(data.image || null)
      } else {
        const err = await res.json()
        console.error("Failed to fetch profile:", err.error)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Handle Profile Photo Upload & Convert to Base64
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit to 2MB to keep base64 storage reasonable
    if (file.size > 2 * 1024 * 1024) {
      setProfileMessage({
        type: "error",
        text: "Profile photo must be smaller than 2MB",
      })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setImage(reader.result as string)
    };
    reader.readAsDataURL(file)
  }

  function removePhoto() {
    setImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMessage(null)

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username: username || null,
          email,
          mobile: mobile || null,
          image,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setProfile(data.user)
        setProfileMessage({
          type: "success",
          text: "Profile updated successfully!",
        })
        // Clear message after 4s
        setTimeout(() => setProfileMessage(null), 4000)
      } else {
        setProfileMessage({
          type: "error",
          text: data.error || "Failed to update profile",
        })
      }
    } catch (err) {
      console.error(err)
      setProfileMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "New password and confirmation do not match.",
      })
      return
    }

    setSavingPassword(true)
    setPasswordMessage(null)

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setPasswordMessage({
          type: "success",
          text: "Password updated successfully!",
        })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        // Clear message after 4s
        setTimeout(() => setPasswordMessage(null), 4000)
      } else {
        setPasswordMessage({
          type: "error",
          text: data.error || "Failed to update password",
        })
      }
    } catch (err) {
      console.error(err)
      setPasswordMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setSavingPassword(false)
    }
  }

  function formatDate(iso: string | null): string {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your administrator profile, contact info, and security credentials.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left Column — Forms */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-heading text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Profile Details
            </h2>

            {profileMessage && (
              <div
                className={`mt-4 flex items-start gap-3 rounded-xl border p-4 text-xs ${
                  profileMessage.type === "success"
                    ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                    : "border-red-100 bg-red-50 text-red-800"
                }`}
              >
                {profileMessage.type === "success" ? (
                  <CheckCircle className="h-4.5 w-4.5 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <XCircle className="h-4.5 w-4.5 shrink-0 text-red-600 mt-0.5" />
                )}
                <span>{profileMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="mt-6 space-y-6">
              {/* Photo Upload Row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="Profile Preview" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-slate-400" />
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoChange}
                      accept="image/*"
                      className="hidden"
                      id="profile-photo-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 border-slate-200 bg-white hover:bg-slate-50"
                    >
                      <Camera className="h-4 w-4 text-slate-500" />
                      Upload Photo
                    </Button>
                    {image && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removePhoto}
                        className="flex items-center gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    JPG, PNG or WEBP. Max size 2MB. Recommended 200x200px.
                  </p>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold text-slate-700">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="name"
                      required
                      placeholder="e.g. AdmitWise Admin"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-semibold text-slate-700">Username</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">@</span>
                    <Input
                      id="username"
                      placeholder="e.g. admin_main"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="admin@admitwise.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mobile" className="text-xs font-semibold text-slate-700">Mobile Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="mobile"
                      placeholder="10-digit number"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={savingProfile} className="btn-premium rounded-full px-6 text-xs font-semibold">
                  {savingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Password Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-heading text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Change Password
            </h2>

            {passwordMessage && (
              <div
                className={`mt-4 flex items-start gap-3 rounded-xl border p-4 text-xs ${
                  passwordMessage.type === "success"
                    ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                    : "border-red-100 bg-red-50 text-red-800"
                }`}
              >
                {passwordMessage.type === "success" ? (
                  <CheckCircle className="h-4.5 w-4.5 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <XCircle className="h-4.5 w-4.5 shrink-0 text-red-600 mt-0.5" />
                )}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword" className="text-xs font-semibold text-slate-700">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="currentPassword"
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs font-semibold text-slate-700">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="newPassword"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={savingPassword} className="btn-premium rounded-full px-6 text-xs font-semibold">
                  {savingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column — Info */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-heading text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
              Account Metadata
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Access Role</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{profile?.role || "Super Admin"}</p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Created Date</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{formatDate(profile?.createdAt || null)}</p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Last Login Session</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{formatDate(profile?.lastLogin || null)}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
