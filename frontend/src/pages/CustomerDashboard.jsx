import React, { useEffect, useState, useRef } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/Card"
import { 
  Calendar, 
  Clock, 
  ArrowRight, 
  XCircle, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Search, 
  Building2, 
  History, 
  Users, 
  CalendarPlus, 
  LogOut, 
  ChevronRight,
  ExternalLink,
  ChevronLeft
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useSocket } from "../context/SocketContext"
import { useNetwork } from "../context/NetworkContext"

export default function CustomerDashboard() {
  const { user, logout } = useAuth()
  const { socket, isConnected, isReconnecting, connectionRestored } = useSocket()
  const { isOnline } = useNetwork()
  const location = useLocation()
  const navigate = useNavigate()

  const [appointments, setAppointments] = useState([])
  const [activeQueues, setActiveQueues] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState(null)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState(location.state?.message || "")

  // Pagination for history
  const [historyPage, setHistoryPage] = useState(1)
  const itemsPerPage = 5

  const appointmentsSectionRef = useRef(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    if (!socket) return

    const handleUpdate = () => {
      fetchDashboardData()
    }

    socket.on('user_updated', handleUpdate)
    socket.on('queue_updated', handleUpdate)
    socket.on('connect', handleUpdate)

    return () => {
      socket.off('user_updated', handleUpdate)
      socket.off('queue_updated', handleUpdate)
      socket.off('connect', handleUpdate)
    }
  }, [socket])

  const fetchDashboardData = async () => {
    if (!user?.token) return
    try {
      const [apptRes, queueRes] = await Promise.all([
        fetch('/api/appointments', {
          headers: { 'Authorization': `Bearer ${user.token}` }
        }),
        fetch('/api/queue/my', {
          headers: { 'Authorization': `Bearer ${user.token}` }
        })
      ])

      if (apptRes.ok) {
        const apptData = await apptRes.json()
        setAppointments(Array.isArray(apptData) ? apptData : [])
      }

      if (queueRes.ok) {
        const queueData = await queueRes.json()
        setActiveQueues(Array.isArray(queueData) ? queueData : [])
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelAppointment = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return
    setCancellingId(id)
    setError("")
    setSuccessMsg("")
    try {
      const res = await fetch(`/api/appointments/${id}/cancel`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to cancel appointment')
      setSuccessMsg("Appointment cancelled successfully.")
      fetchDashboardData()
    } catch (err) {
      setError(err.message)
    } finally {
      setCancellingId(null)
    }
  }

  const scrollToAppointments = () => {
    appointmentsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Real statistics computation from authentic database records
  const totalAppointments = appointments.length
  const upcomingAppointments = appointments.filter(a => a.status === 'scheduled')
  const completedAppointments = appointments.filter(a => a.status === 'completed')
  const cancelledAppointments = appointments.filter(a => a.status === 'cancelled')
  const activeQueuesCount = activeQueues.length

  // Filter for history (completed, cancelled, or no-show)
  const historyAppointments = appointments.filter(a => a.status !== 'scheduled')
  const totalHistoryPages = Math.ceil(historyAppointments.length / itemsPerPage) || 1
  const displayedHistory = historyAppointments.slice(
    (historyPage - 1) * itemsPerPage,
    historyPage * itemsPerPage
  )

  const formatTime12H = (time24) => {
    if (!time24) return ""
    const [h, m] = time24.split(':')
    const hInt = parseInt(h, 10)
    const ampm = hInt >= 12 ? 'PM' : 'AM'
    const h12 = hInt % 12 || 12
    return `${h12}:${m} ${ampm}`
  }

  const formatDate = (dateString) => {
    if (!dateString) return ""
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U'
  const customerName = user?.name ? user.name.trim() : "Customer"

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Dynamic Connection Status Notice */}
      {(!isOnline || isReconnecting) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 flex items-center justify-center rounded-lg text-sm font-medium shadow-xs">
          <AlertCircle className="h-4 w-4 mr-2.5 text-amber-600 animate-pulse shrink-0" />
          <span>Connection temporarily unavailable. Reconnecting...</span>
        </div>
      )}

      {connectionRestored && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-3.5 flex items-center justify-center rounded-lg text-sm font-medium shadow-xs transition-all animate-fade-in">
          <CheckCircle2 className="h-4 w-4 mr-2.5 text-green-600 shrink-0" />
          <span>Connection restored. Live updates are active.</span>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm font-medium flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-3 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-800 text-xs font-bold uppercase ml-4">Dismiss</button>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg text-sm font-medium flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-3 text-green-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-green-500 hover:text-green-800 text-xs font-bold uppercase ml-4">Dismiss</button>
        </div>
      )}

      {/* Dashboard Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-1 rounded-full">
            Customer Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            Welcome back, {customerName}!
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Track your real-time queue position, view upcoming appointments, or discover trusted healthcare and financial services nearby.
          </p>
        </div>

        {/* Right side: Clickable Profile/Avatar section & Logout button */}
        <div className="flex items-center gap-3 self-start md:self-center shrink-0">
          <Link 
            to="/profile"
            className="flex items-center gap-3 p-2 pr-4 rounded-full border border-slate-200 bg-slate-50/80 hover:bg-slate-100 hover:border-primary/40 transition-all group"
            title="Open Customer Profile"
          >
            <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
              {userInitial}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-tight group-hover:text-primary transition-colors">{customerName}</p>
              <p className="text-[11px] text-slate-500 font-medium leading-tight">View Profile</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
          </Link>

          <Button 
            variant="outline" 
            size="sm"
            onClick={logout}
            className="text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 h-10 px-3"
            title="Log out of QueueLess"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      {/* Customer Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Appointments */}
        <Card className="border-slate-200/80 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Bookings</span>
              <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-slate-900">{loading ? "..." : totalAppointments}</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Lifetime appointments</p>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="border-slate-200/80 shadow-xs border-l-4 border-l-primary">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Upcoming</span>
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <CalendarPlus className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-primary">{loading ? "..." : upcomingAppointments.length}</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Scheduled slots</p>
            </div>
          </CardContent>
        </Card>

        {/* Active Queues */}
        <Card className="border-slate-200/80 shadow-xs border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Active Queues</span>
              <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-amber-600">{loading ? "..." : activeQueuesCount}</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Currently waiting / called</p>
            </div>
          </CardContent>
        </Card>

        {/* Completed Appointments */}
        <Card className="border-slate-200/80 shadow-xs border-l-4 border-l-green-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Completed</span>
              <div className="p-2 bg-green-100 rounded-lg text-green-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-green-600">{loading ? "..." : completedAppointments.length}</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Finished services</p>
            </div>
          </CardContent>
        </Card>

        {/* Cancelled Appointments */}
        <Card className="border-slate-200/80 shadow-xs col-span-2 lg:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Cancelled</span>
              <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                <XCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-slate-600">{loading ? "..." : cancelledAppointments.length}</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Cancelled bookings</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Bar */}
      <Card className="border-slate-200 shadow-xs bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Quick Actions</h2>
              <p className="text-xs text-slate-300 mt-0.5">Access primary QueueLess workflows with one click</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link to="/organizations">
                <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9">
                  <Search className="h-3.5 w-3.5 mr-1.5" />
                  Find Services
                </Button>
              </Link>
              <Link to="/organizations">
                <Button className="bg-primary hover:bg-primary/90 text-white text-xs h-9">
                  <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
                  Book Appointment
                </Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={scrollToAppointments}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9"
              >
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                View My Appointments
              </Button>
              <Link to="/profile">
                <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9">
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  Edit My Profile
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column (2 Cols): Active Queues & Upcoming Appointments */}
        <div className="lg:col-span-2 space-y-8">
          {/* SECTION A: Active Queues */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                    Active Queues
                  </CardTitle>
                  <CardDescription>Live position in digital queues you have joined</CardDescription>
                </div>
                {activeQueues.length > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    {activeQueues.length} Active
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="py-8 text-center text-sm text-slate-400 animate-pulse">Loading active queues...</div>
              ) : activeQueues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="bg-slate-50 p-4 rounded-full mb-3 border border-slate-100">
                    <Clock className="h-8 w-8 text-slate-300" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-800">No active queues</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                    You are not currently waiting in any digital queue. Join a walk-in queue from our approved organizations.
                  </p>
                  <Link to="/organizations">
                    <Button variant="outline" size="sm">
                      <Search className="h-3.5 w-3.5 mr-1.5" />
                      Browse Services
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeQueues.map((q) => {
                    const statusColor = 
                      q.status === 'serving' ? 'bg-green-100 text-green-800 border-green-200' :
                      q.status === 'called' ? 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse' :
                      'bg-amber-100 text-amber-800 border-amber-200'

                    return (
                      <div 
                        key={q._id} 
                        className="p-5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${statusColor}`}>
                              {q.status}
                            </span>
                            <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                              Token #{q.tokenNumber}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-slate-900">{q.service?.name || "Service"}</h4>
                          <p className="text-xs text-slate-500 flex items-center">
                            <Building2 className="h-3.5 w-3.5 mr-1 text-slate-400" />
                            {q.organization?.name} • {q.organization?.address?.city || ""}
                          </p>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 border-t sm:border-t-0 pt-3 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <p className="text-xs text-slate-500">
                              People Ahead: <span className="font-bold text-slate-900">{q.peopleAhead}</span>
                            </p>
                            {q.estimatedWaitTime > 0 && (
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Est. Wait: ~{q.estimatedWaitTime} mins
                              </p>
                            )}
                          </div>
                          <Link to={`/queue/${q._id}`}>
                            <Button size="sm" className="h-8 text-xs">
                              Live Status
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SECTION B: Upcoming Appointments */}
          <div ref={appointmentsSectionRef}>
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Upcoming Appointments
                    </CardTitle>
                    <CardDescription>Scheduled slots confirmed on the platform</CardDescription>
                  </div>
                  <Link to="/organizations">
                    <Button variant="outline" size="sm" className="text-xs h-8">
                      <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                      New Booking
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="py-8 text-center text-sm text-slate-400 animate-pulse">Loading appointments...</div>
                ) : upcomingAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="bg-slate-50 p-4 rounded-full mb-3 border border-slate-100">
                      <Calendar className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-800">No upcoming appointments</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                      You don't have any future scheduled appointments. Browse organizations to book a consultation or visit.
                    </p>
                    <Link to="/organizations">
                      <Button size="sm">
                        <Search className="h-3.5 w-3.5 mr-1.5" />
                        Find Services
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingAppointments.map((apt) => (
                      <div 
                        key={apt._id} 
                        className="p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                              {apt.organization?.type || "Service"}
                            </span>
                            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              Token #{apt.tokenNumber}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-slate-900">{apt.service?.name}</h4>
                          <p className="text-xs font-medium text-slate-600 flex items-center">
                            <Building2 className="h-3.5 w-3.5 mr-1 text-slate-400" />
                            {apt.organization?.name} • {apt.organization?.address?.city || ""}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:text-right">
                          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-primary" />
                              {formatDate(apt.date)}
                            </p>
                            <p className="text-slate-500 flex items-center gap-1.5 mt-1">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {formatTime12H(apt.time)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={cancellingId === apt._id}
                              isLoading={cancellingId === apt._id}
                              onClick={() => handleCancelAppointment(apt._id)}
                              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-8"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: SECTION C: Recent Booking History */}
        <div className="space-y-8">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-slate-600" />
                Booking History
              </CardTitle>
              <CardDescription>Previous completed and cancelled appointments</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="py-8 text-center text-sm text-slate-400 animate-pulse">Loading history...</div>
              ) : historyAppointments.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No previous appointment history yet.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {displayedHistory.map((item) => {
                    const isCompleted = item.status === 'completed'
                    const isCancelled = item.status === 'cancelled'
                    const badgeClass = isCompleted 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : isCancelled
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'

                    return (
                      <div key={item._id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-800 line-clamp-1">{item.service?.name}</p>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${badgeClass}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{item.organization?.name}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100/80">
                          <span>{formatDate(item.date)}</span>
                          <span>{formatTime12H(item.time)}</span>
                        </div>
                      </div>
                    )
                  })}

                  {/* History Pagination */}
                  {totalHistoryPages > 1 && (
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={historyPage <= 1}
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                        className="h-7 px-2 text-xs"
                      >
                        <ChevronLeft className="h-3 w-3 mr-1" />
                        Prev
                      </Button>
                      <span className="text-slate-500">Page {historyPage} of {totalHistoryPages}</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={historyPage >= totalHistoryPages}
                        onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                        className="h-7 px-2 text-xs"
                      >
                        Next
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Information & Assistance Card */}
          <Card className="border-slate-200 shadow-xs bg-slate-50/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-800">Need Assistance?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-600">
              <p>
                Our AI Virtual Assistant is available at the bottom-right corner of your screen to answer questions regarding queue estimates, clinic hours, or booking guidance.
              </p>
              <div className="pt-2">
                <Link to="/organizations">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    <Building2 className="h-3.5 w-3.5 mr-1.5" />
                    Browse All Organizations
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
