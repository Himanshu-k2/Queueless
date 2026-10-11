import React, { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card"
import { Calendar, Clock, ArrowRight, XCircle, AlertCircle } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useSocket } from "../context/SocketContext"

export default function CustomerDashboard() {
  const { user } = useAuth()
  const { socket, isConnected } = useSocket()
  const location = useLocation()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState(location.state?.message || "")

  useEffect(() => {
    fetchAppointments()
  }, [])

  useEffect(() => {
    if (!socket) return;
    
    // When the backend updates anything regarding this user, it emits user_updated
    const handleUpdate = () => {
      fetchAppointments();
    };
    
    socket.on('user_updated', handleUpdate);
    
    // Also fetch on reconnect to avoid stale data
    socket.on('connect', handleUpdate);
    
    return () => {
      socket.off('user_updated', handleUpdate);
      socket.off('connect', handleUpdate);
    };
  }, [socket]);

  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/appointments', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      const data = await res.json()
      if (res.ok) setAppointments(data)
      setLoading(false)
    } catch (err) {
      setLoading(false)
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      setError("")
      setSuccessMsg("")
      const res = await fetch(`/api/appointments/${id}/cancel`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to cancel appointment')
      setSuccessMsg("Appointment cancelled successfully.")
      fetchAppointments()
    } catch (err) {
      setError(err.message)
    }
  }

  // Basic mock queues for phase 4 logic (which specifically focuses on appointments right now)
  const activeQueues = [] 

  const upcomingAppointments = appointments.filter(a => a.status === 'scheduled')
  const historyAppointments = appointments.filter(a => a.status !== 'scheduled')

  const formatTime12H = (time24) => {
    if (!time24) return "";
    const [h, m] = time24.split(':');
    const hInt = parseInt(h, 10);
    const ampm = hInt >= 12 ? 'PM' : 'AM';
    const h12 = hInt % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {!isConnected && (
        <div className="mb-4 bg-amber-50 text-amber-800 p-3 flex items-center justify-center rounded-md text-sm font-medium">
          <AlertCircle className="h-4 w-4 mr-2 animate-pulse" />
          Connection temporarily unavailable. Reconnecting...
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold text-slate-900">Welcome, {user?.name.split(' ')[0]}</h1>
        <div className="flex gap-3">
          <Link to="/register-organization">
            <Button variant="outline" className="bg-white">Register Organisation</Button>
          </Link>
          <Link to="/organizations">
            <Button>Find New Services</Button>
          </Link>
        </div>
      </div>

      {error && <div className="mb-4 text-sm font-medium text-destructive bg-destructive/10 p-4 rounded-md">{error}</div>}
      {successMsg && <div className="mb-4 text-sm font-medium text-green-700 bg-green-50 p-4 rounded-md">{successMsg}</div>}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Queues */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Active Queues
            </CardTitle>
            <CardDescription>You are currently waiting for these services.</CardDescription>
          </CardHeader>
          <CardContent>
            {activeQueues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="bg-slate-50 p-4 rounded-full mb-4">
                  <Clock className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">No active queues</h3>
                <p className="text-sm text-slate-500 max-w-sm">You are not waiting for any services right now.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeQueues.map((q) => (
                  <div key={q.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-semibold text-slate-900">{q.service}</p>
                      <p className="text-sm text-muted-foreground">{q.organization}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">Position <span className="font-bold text-slate-900">{q.position}</span></p>
                      <Link to={`/queue/${q.id}`}>
                        <Button variant="outline" size="sm">View Status</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Appointments
            </CardTitle>
            <CardDescription>Your scheduled visits.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground py-8 text-center animate-pulse">Loading your appointments...</p>
            ) : upcomingAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="bg-slate-50 p-4 rounded-full mb-4">
                  <Calendar className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">No upcoming appointments</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-sm">You're all caught up. Ready to book your next visit?</p>
                <Link to="/organizations">
                  <Button variant="outline" size="sm">Find Services</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((apt) => (
                  <div key={apt._id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-semibold text-slate-900">{apt.service?.name}</p>
                      <p className="text-sm text-muted-foreground">{apt.organization?.name}</p>
                      <p className="text-xs text-primary font-medium mt-1">
                        {new Date(apt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTime12H(apt.time)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">Token: <span className="font-bold text-slate-700">{apt.tokenNumber}</span></p>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/services/${apt.service._id}/book`} state={{ orgId: apt.organization._id, rescheduleId: apt._id }}>
                        <Button variant="outline" size="sm" className="border-primary/30 hover:bg-primary/10">
                          Reschedule
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" onClick={() => handleCancel(apt._id)} className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointment History */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              Booking History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground py-4 text-center">Loading history...</p>
            ) : historyAppointments.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center">No past appointments.</p>
            ) : (
              <div className="space-y-4">
                {historyAppointments.map((apt) => (
                  <div key={apt._id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 opacity-70">
                    <div>
                      <p className="font-semibold text-slate-900">{apt.service?.name}</p>
                      <p className="text-sm text-muted-foreground">{apt.organization?.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(apt.date).toLocaleDateString()} at {formatTime12H(apt.time)}
                      </p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        apt.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        apt.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
