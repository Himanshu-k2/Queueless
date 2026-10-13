import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/Card"
import { useAuth } from "../context/AuthContext"
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Lock, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  Edit3, 
  Save, 
  X, 
  ShieldCheck,
  CalendarCheck
} from "lucide-react"

export default function CustomerProfile() {
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ total: 0, upcoming: 0, completed: 0 })
  const [loading, setLoading] = useState(true)

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editLoading, setEditLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState("")
  const [profileError, setProfileError] = useState("")

  // Change password state
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [passwordError, setPasswordError] = useState("")

  useEffect(() => {
    fetchProfileAndStats()
  }, [])

  const fetchProfileAndStats = async () => {
    if (!user?.token) return
    setLoading(true)
    try {
      // 1. Fetch authenticated user profile
      const profRes = await fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      if (profRes.ok) {
        const profData = await profRes.json()
        setProfile(profData)
        setEditName(profData.name || "")
        setEditPhone(profData.phone || "")
      }

      // 2. Fetch appointments to calculate accurate customer statistics
      const apptRes = await fetch('/api/appointments', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      if (apptRes.ok) {
        const appts = await apptRes.json()
        const total = appts.length
        const upcoming = appts.filter(a => a.status === 'scheduled').length
        const completed = appts.filter(a => a.status === 'completed').length
        setStats({ total, upcoming, completed })
      }
    } catch (err) {
      console.error("Error loading profile:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setProfileSuccess("")
    setProfileError("")

    if (!editName.trim()) {
      setProfileError("Full Name cannot be empty.")
      return
    }

    setEditLoading(true)
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim()
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile')
      }

      // Update local profile state
      setProfile(data)
      // Instantly refresh navbar and AuthContext across the application
      updateUser({ name: data.name, phone: data.phone })
      setProfileSuccess("Profile updated successfully!")
      setIsEditing(false)
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setEditLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordSuccess("")
    setPasswordError("")

    if (!currentPassword) {
      setPasswordError("Please enter your current password.")
      return
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.")
      return
    }

    setPasswordLoading(true)
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Failed to change password')
      }

      setPasswordSuccess("Password changed successfully!")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setIsChangingPassword(false)
    } catch (err) {
      setPasswordError(err.message)
    } finally {
      setPasswordLoading(false)
    }
  }

  const userInitial = (profile?.name || user?.name || "U").trim().charAt(0).toUpperCase()
  const memberSince = profile?.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : "QueueLess Member"

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Navigation header */}
      <div className="flex items-center justify-between mb-8">
        <Link 
          to="/dashboard" 
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      {/* Profile Overview Card */}
      <Card className="border-slate-200 overflow-hidden shadow-sm mb-8">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-primary/20 border-2 border-white/20 text-white flex items-center justify-center font-bold text-3xl shadow-inner">
              {userInitial}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{profile?.name || user?.name}</h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary-foreground border border-primary/30">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Verified Customer
                </span>
              </div>
              <p className="text-slate-300 text-sm mt-1">{profile?.email || user?.email}</p>
              <p className="text-slate-400 text-xs mt-2 flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1 opacity-70" />
                Member since {memberSince}
              </p>
            </div>
            {!isEditing && (
              <Button 
                onClick={() => {
                  setIsEditing(true)
                  setProfileSuccess("")
                  setProfileError("")
                }}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 self-start sm:self-auto"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* Real Customer Statistics Bar */}
        <div className="grid grid-cols-3 border-t border-slate-100 bg-slate-50/70 divide-x divide-slate-100">
          <div className="p-4 text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Appointments</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? "..." : stats.total}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming</p>
            <p className="text-2xl font-bold text-primary mt-1">{loading ? "..." : stats.upcoming}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{loading ? "..." : stats.completed}</p>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      {profileSuccess && (
        <div className="mb-6 bg-green-50 text-green-800 p-4 rounded-lg text-sm font-medium border border-green-200 flex items-center">
          <CheckCircle className="h-5 w-5 mr-3 text-green-600 shrink-0" />
          <span>{profileSuccess}</span>
        </div>
      )}
      {profileError && (
        <div className="mb-6 bg-red-50 text-red-800 p-4 rounded-lg text-sm font-medium border border-red-200 flex items-center">
          <AlertCircle className="h-5 w-5 mr-3 text-red-600 shrink-0" />
          <span>{profileError}</span>
        </div>
      )}
      {passwordSuccess && (
        <div className="mb-6 bg-green-50 text-green-800 p-4 rounded-lg text-sm font-medium border border-green-200 flex items-center">
          <CheckCircle className="h-5 w-5 mr-3 text-green-600 shrink-0" />
          <span>{passwordSuccess}</span>
        </div>
      )}
      {passwordError && (
        <div className="mb-6 bg-red-50 text-red-800 p-4 rounded-lg text-sm font-medium border border-red-200 flex items-center">
          <AlertCircle className="h-5 w-5 mr-3 text-red-600 shrink-0" />
          <span>{passwordError}</span>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {/* Account Details & Edit Profile Card */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <User className="h-5 w-5 mr-2 text-primary" />
              Account Information
            </CardTitle>
            <CardDescription>
              {isEditing ? "Update your personal profile details" : "Your personal contact and account details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase">Full Name</label>
                  <Input 
                    type="text" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    placeholder="e.g. Pappu Kumar"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase">Phone Number</label>
                  <Input 
                    type="tel" 
                    value={editPhone} 
                    onChange={e => setEditPhone(e.target.value)} 
                    placeholder="+91 9876543210"
                  />
                  <p className="text-[11px] text-slate-400">Used for queue notifications and SMS alerts</p>
                </div>
                <div className="space-y-1.5 opacity-60">
                  <label className="text-xs font-semibold text-slate-700 uppercase">Email Address (Locked)</label>
                  <Input 
                    type="email" 
                    value={profile?.email || user?.email || ""} 
                    disabled 
                    className="bg-slate-50 cursor-not-allowed"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" isLoading={editLoading} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsEditing(false)
                      setEditName(profile?.name || "")
                      setEditPhone(profile?.phone || "")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between py-2 border-b border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Full Name</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{profile?.name || user?.name}</p>
                  </div>
                  <User className="h-4 w-4 text-slate-400 mt-1" />
                </div>
                <div className="flex items-start justify-between py-2 border-b border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Email Address</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{profile?.email || user?.email}</p>
                  </div>
                  <Mail className="h-4 w-4 text-slate-400 mt-1" />
                </div>
                <div className="flex items-start justify-between py-2 border-b border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Phone Number</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                      {profile?.phone || <span className="text-slate-400 font-normal italic">Not provided</span>}
                    </p>
                  </div>
                  <Phone className="h-4 w-4 text-slate-400 mt-1" />
                </div>
                <div className="flex items-start justify-between py-2">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Account Role</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5 capitalize">{profile?.role || user?.role || "Customer"}</p>
                  </div>
                  <ShieldCheck className="h-4 w-4 text-slate-400 mt-1" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security & Password Card */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Lock className="h-5 w-5 mr-2 text-primary" />
              Security & Password
            </CardTitle>
            <CardDescription>Manage your password and security credentials</CardDescription>
          </CardHeader>
          <CardContent>
            {isChangingPassword ? (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase">Current Password</label>
                  <Input 
                    type="password" 
                    value={currentPassword} 
                    onChange={e => setCurrentPassword(e.target.value)} 
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase">New Password</label>
                  <Input 
                    type="password" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    placeholder="At least 6 characters"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase">Confirm New Password</label>
                  <Input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" isLoading={passwordLoading} className="flex-1">
                    Update Password
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsChangingPassword(false)
                      setCurrentPassword("")
                      setNewPassword("")
                      setConfirmPassword("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Ensure your account uses a strong password with a minimum of 6 characters to keep your appointment history secure.
                </p>
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsChangingPassword(true)
                      setPasswordSuccess("")
                      setPasswordError("")
                    }}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
