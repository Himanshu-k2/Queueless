import React, { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card"
import { Users, CheckCircle, Clock, AlertCircle, RefreshCw, LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { useSocket } from "../context/SocketContext"

export default function StaffDashboard() {
  const { user } = useAuth()
  const { socket, isConnected, joinQueueRoom, leaveQueueRoom } = useSocket()
  const navigate = useNavigate()
  
  const [organizations, setOrganizations] = useState([])
  const [services, setServices] = useState([])
  
  const [selectedOrg, setSelectedOrg] = useState("")
  const [selectedService, setSelectedService] = useState("")
  
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // Initial fetch of orgs
    fetch('/api/organizations/staff/my-orgs', { headers: { 'Authorization': `Bearer ${user?.token}` }})
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOrganizations(data)
          if (data.length === 1) {
            setSelectedOrg(data[0]._id)
          }
        }
      })
  }, [user])

  useEffect(() => {
    if (selectedOrg) {
      fetch(`/api/services/org/${selectedOrg}`, { headers: { 'Authorization': `Bearer ${user?.token}` }})
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setServices(data)
        })
    } else {
      setServices([])
      setSelectedService("")
    }
  }, [selectedOrg, user])

  const fetchQueue = () => {
    if (!selectedOrg || !selectedService) return;
    setLoading(true)
    fetch(`/api/queue/active?orgId=${selectedOrg}&serviceId=${selectedService}`, {
      headers: { 'Authorization': `Bearer ${user?.token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEntries(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    if (!selectedService) return;
    
    fetchQueue();
    joinQueueRoom(selectedService);
    
    if (socket) {
      const handleUpdate = () => fetchQueue();
      socket.on('queue_updated', handleUpdate);
      socket.on('connect', handleUpdate);
      
      return () => {
        leaveQueueRoom(selectedService);
        socket.off('queue_updated', handleUpdate);
        socket.off('connect', handleUpdate);
      };
    }
  }, [selectedOrg, selectedService, socket, user])

  const handleAction = async (method, url, body) => {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: body ? JSON.stringify(body) : null
      });
      if (!res.ok) {
        const err = await res.json()
        alert(err.message || "Action failed")
      }
      fetchQueue()
    } catch (e) {
      alert(e.message)
    }
  }

  const callNext = () => handleAction('POST', '/api/queue/call-next', { organization: selectedOrg, service: selectedService })
  
  const updateStatus = (entryId, status, autoCallNext = false) => {
    handleAction('PUT', `/api/queue/${entryId}`, { status, autoCallNext })
  }

  if (!selectedService) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Staff Dashboard Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select Organization</label>
              <select className="w-full border rounded-md p-2" value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}>
                <option value="">-- Choose Organization --</option>
                {organizations.map(org => <option key={org._id} value={org._id}>{org.name}</option>)}
              </select>
            </div>
            {selectedOrg && (
              <div>
                <label className="block text-sm font-medium mb-1">Select Service to Manage</label>
                <select className="w-full border rounded-md p-2" value={selectedService} onChange={e => setSelectedService(e.target.value)}>
                  <option value="">-- Choose Queue / Service --</option>
                  {services.map(svc => <option key={svc._id} value={svc._id}>{svc.name}</option>)}
                </select>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentServing = entries.find(e => e.status === 'called' || e.status === 'serving')
  const waitingList = entries.filter(e => e.status === 'waiting' && !e.isWaitlisted)
  const waitlisted = entries.filter(e => e.status === 'waiting' && e.isWaitlisted)
  const historyList = entries.filter(e => ['completed', 'skipped', 'no-show', 'cancelled'].includes(e.status)).reverse()

  const stats = {
    totalServed: entries.filter(e => e.status === 'completed').length,
    waitingCount: waitingList.length + waitlisted.length,
    skippedCount: entries.filter(e => e.status === 'skipped').length,
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {!isConnected && (
        <div className="mb-4 bg-amber-50 text-amber-800 p-3 flex items-center justify-center rounded-md text-sm font-medium">
          <AlertCircle className="h-4 w-4 mr-2 animate-pulse" />
          Connection temporarily unavailable. Reconnecting...
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Operations Console</h1>
          <p className="text-slate-600 mt-1">
            {organizations.find(o => o._id === selectedOrg)?.name} • {services.find(s => s._id === selectedService)?.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg mr-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-semibold text-primary">{stats.waitingCount} Waiting</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchQueue} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedService("")}>
            Change Queue
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Stats Row */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Total Served Today</p>
              <p className="text-2xl font-bold text-green-900">{stats.totalServed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Currently Waiting</p>
              <p className="text-2xl font-bold text-blue-900">{stats.waitingCount}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-800">Skipped/Passed</p>
              <p className="text-2xl font-bold text-amber-900">{stats.skippedCount}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-amber-600 opacity-50" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Current Serving */}
        <Card className="lg:col-span-1 border border-primary/20 shadow-md flex flex-col overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-primary font-semibold">Currently Serving</CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between">
            {currentServing ? (
              <>
                <div className="text-center mb-6">
                  <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase mb-4 tracking-wider">
                    {currentServing.status}
                  </span>
                  <span className="text-6xl font-bold block mb-2">{currentServing.tokenNumber}</span>
                  <span className="text-xl text-slate-700 font-medium">{currentServing.customer?.name}</span>
                  <p className="text-muted-foreground mt-1">Joined: {new Date(currentServing.joinedAt).toLocaleTimeString()}</p>
                </div>
                <div className="space-y-3 mt-auto">
                  {currentServing.status === 'called' && (
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => updateStatus(currentServing._id, 'serving')}>
                      Start Serving
                    </Button>
                  )}
                  <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => updateStatus(currentServing._id, 'completed', true)}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Complete & Call Next
                  </Button>
                  <Button variant="outline" className="w-full text-amber-600 border-amber-600 hover:bg-amber-50" onClick={() => updateStatus(currentServing._id, 'skipped', true)}>
                    Skip & Call Next
                  </Button>
                  <Button variant="outline" className="w-full text-destructive border-destructive hover:bg-destructive/10" onClick={() => updateStatus(currentServing._id, 'no-show', true)}>
                    Mark No-Show
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 flex-1 flex flex-col items-center justify-center">
                <p className="text-muted-foreground mb-4">No one is currently being served.</p>
                <Button size="lg" onClick={callNext} disabled={waitingList.length === 0}>
                  Call Next Customer
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Up Next List */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Waiting List</CardTitle>
            <Button size="sm" onClick={callNext} disabled={waitingList.length === 0}>Call Next</Button>
          </CardHeader>
          <CardContent>
            {waitingList.length === 0 && waitlisted.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Queue is empty.</p>
            ) : (
              <div className="divide-y max-h-[500px] overflow-y-auto pr-2">
                {waitingList.map((person, idx) => (
                  <div key={person._id} className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className={`rounded text-center px-3 py-2 min-w-[80px] ${idx === 0 ? 'bg-primary/10 border border-primary/20' : 'bg-slate-100'}`}>
                        <span className={`font-bold text-lg block ${idx === 0 ? 'text-primary' : 'text-slate-900'}`}>{person.tokenNumber}</span>
                        {idx === 0 && <span className="text-xs font-bold text-primary uppercase tracking-widest">Next</span>}
                        {person.priorityScore > 0 && <span className="text-xs font-bold text-amber-600 uppercase">Priority</span>}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{person.customer?.name}</p>
                        <p className="text-xs text-muted-foreground">Joined: {new Date(person.joinedAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <div>
                      <Button variant="outline" size="sm" onClick={() => updateStatus(person._id, 'called')}>
                        Call (Override)
                      </Button>
                    </div>
                  </div>
                ))}
                
                {/* Waitlisted Section */}
                {waitlisted.length > 0 && (
                  <div className="pt-4 mt-4 border-t-2 border-dashed">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Waitlist (Standby)</p>
                    {waitlisted.map((person) => (
                      <div key={person._id} className="flex items-center justify-between py-3 opacity-70">
                        <div className="flex items-center gap-4">
                          <div className="bg-slate-50 rounded text-center px-3 py-1 min-w-[80px]">
                            <span className="font-semibold text-slate-700 block">{person.tokenNumber}</span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{person.customer?.name}</p>
                          </div>
                        </div>
                        <div>
                          <Button variant="ghost" size="sm" onClick={() => updateStatus(person._id, 'called')}>
                            Call
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History Log */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's History</CardTitle>
          </CardHeader>
          <CardContent>
            {historyList.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center">No history for today.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {historyList.map(item => (
                  <div key={item._id} className="flex items-center justify-between bg-slate-50 p-3 rounded-md">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-700 w-20">{item.tokenNumber}</span>
                      <span className="font-medium">{item.customer?.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${
                        item.status === 'completed' ? 'bg-green-100 text-green-700' :
                        item.status === 'skipped' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.status}
                      </span>
                      <Button variant="ghost" size="sm" className="h-8 text-xs underline" onClick={() => updateStatus(item._id, 'called')}>
                        Recall
                      </Button>
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
