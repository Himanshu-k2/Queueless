import React, { useEffect, useState, useRef } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { Button } from "../components/ui/Button"
import { Card, CardContent } from "../components/ui/Card"
import { Users, Clock, AlertCircle } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useSocket } from "../context/SocketContext"

export default function QueueStatus() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket, isConnected, joinQueueRoom, leaveQueueRoom } = useSocket()
  
  const [statusData, setStatusData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/queue/${ticketId}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      const data = await res.json()
      if (res.ok) setStatusData(data)
      else setError(data.message)
      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ticketId.startsWith('new-')) {
      setError("Please join queue from the dashboard.");
      setLoading(false);
      return;
    }

    fetchStatus();

    if (socket) {
      const handleUpdate = () => fetchStatus();
      socket.on('user_updated', handleUpdate);
      socket.on('connect', handleUpdate);

      return () => {
        socket.off('user_updated', handleUpdate);
        socket.off('connect', handleUpdate);
      };
    }
  }, [ticketId, user, socket])

  // Optional: Join the queue room for real-time ETA updates when someone else in the same queue is called
  useEffect(() => {
    if (statusData?.entry?.service?._id) {
      joinQueueRoom(statusData.entry.service._id)
      return () => leaveQueueRoom(statusData.entry.service._id)
    }
  }, [statusData?.entry?.service?._id, joinQueueRoom, leaveQueueRoom])

  // Also listen for queue_updated to refresh ETA
  useEffect(() => {
    if (socket) {
      const handleQueueUpdate = () => fetchStatus();
      socket.on('queue_updated', handleQueueUpdate);
      return () => socket.off('queue_updated', handleQueueUpdate);
    }
  }, [socket]);

  const handleLeave = async () => {
    if (!window.confirm("Are you sure you want to leave the queue?")) return;
    try {
      await fetch(`/api/queue/${ticketId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ status: 'cancelled' })
      })
      navigate('/dashboard')
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return <div className="text-center py-12">Loading...</div>
  if (error) return <div className="text-center py-12 text-destructive">{error}</div>
  if (!statusData) return null

  const { entry, peopleAhead, estimatedWaitTime } = statusData

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 lg:px-8">
      {!isConnected && (
        <div className="mb-4 bg-amber-50 text-amber-800 p-3 flex items-center justify-center rounded-md text-sm font-medium">
          <AlertCircle className="h-4 w-4 mr-2 animate-pulse" />
          Connection temporarily unavailable. Reconnecting...
        </div>
      )}

      <Card className="text-center overflow-hidden border-0 shadow-2xl shadow-primary/10 rounded-3xl">
        <div className="bg-gradient-to-br from-primary to-primary/80 p-8 text-white relative">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
          <h2 className="text-lg font-medium opacity-90 relative z-10">Your Ticket Number</h2>
          <div className="text-7xl font-bold mt-2 relative z-10 tracking-tight">{entry.tokenNumber}</div>
          <p className="mt-4 text-sm opacity-90 relative z-10 font-medium">{entry.service?.name} • {entry.organization?.name}</p>
        </div>
        
        <CardContent className="p-8">
          <div className="grid grid-cols-2 gap-8 divide-x divide-slate-100">
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">People Ahead</span>
              <span className="text-4xl font-semibold text-slate-800 flex items-center">
                <Users className="h-6 w-6 mr-3 text-primary/50" />
                {peopleAhead}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Est. Wait</span>
              <span className="text-4xl font-semibold text-slate-800 flex items-center">
                <Clock className="h-6 w-6 mr-3 text-primary/50" />
                {estimatedWaitTime}<span className="text-xl ml-1">m</span>
              </span>
            </div>
          </div>

          <div className="mt-10 bg-blue-50/50 border border-blue-100 text-blue-800 p-4 rounded-xl flex items-start text-sm text-left">
            <AlertCircle className="h-5 w-5 mr-3 shrink-0 text-blue-500" />
            <p className="leading-relaxed">We'll notify you when it's your turn. Current status: <span className="font-bold text-blue-900">{entry.status.toUpperCase()}</span></p>
          </div>

          <div className="mt-8 space-y-3">
            <Button variant="outline" className="w-full h-12 text-destructive hover:bg-destructive/10 border-destructive/20 rounded-full" onClick={handleLeave}>
              Leave Queue
            </Button>
            <Button variant="ghost" className="w-full h-12 text-slate-500 rounded-full" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
