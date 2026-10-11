import React, { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/Card"
import { Building, Users, Calendar, Clock, BarChart3, Settings, AlertCircle, CheckCircle, XCircle } from "lucide-react"

export default function AdminDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("verification")
  
  const [pendingOrgs, setPendingOrgs] = useState([])
  const [pendingStaff, setPendingStaff] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchPendingData = async () => {
    setLoading(true)
    try {
      const [orgsRes, staffRes] = await Promise.all([
        fetch('/api/admin/pending-orgs', { headers: { 'Authorization': `Bearer ${user.token}` } }),
        fetch('/api/admin/pending-staff', { headers: { 'Authorization': `Bearer ${user.token}` } })
      ])
      if(orgsRes.ok) setPendingOrgs(await orgsRes.json())
      if(staffRes.ok) setPendingStaff(await staffRes.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingData()
  }, [user])

  const handleVerifyOrg = async (id, status, reason = '') => {
    try {
      const res = await fetch(`/api/admin/verify-org/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ status, reason })
      })
      if (res.ok) {
        setPendingOrgs(pendingOrgs.filter(o => o._id !== id))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleVerifyStaff = async (id, status) => {
    try {
      const res = await fetch(`/api/admin/verify-staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ status })
      })
      if (res.ok) {
        setPendingStaff(pendingStaff.filter(s => s._id !== id))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleComingSoon = () => alert("This feature will be unlocked in a future update.")

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'verification', name: 'Organisation Verification', icon: CheckCircle },
    { id: 'orgs', name: 'Organisations', icon: Building },
    { id: 'staff', name: 'Staff Requests', icon: Users },
    { id: 'customers', name: 'Customers', icon: Users },
    { id: 'appointments', name: 'Appointments', icon: Calendar },
    { id: 'queues', name: 'Queue Monitoring', icon: Clock },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 flex-shrink-0">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 px-3">Administration</h2>
        <nav className="space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id 
                ? 'bg-primary text-primary-foreground' 
                : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center">
                <tab.icon className={`mr-3 h-5 w-5 ${activeTab === tab.id ? 'text-primary-foreground' : 'text-slate-400'}`} />
                {tab.name}
              </div>
              {tab.id === 'verification' && pendingOrgs.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                  {pendingOrgs.length}
                </span>
              )}
              {tab.id === 'staff' && pendingStaff.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                  {pendingStaff.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        
        {activeTab === 'verification' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Organisation Verification</h1>
                <p className="text-slate-500 text-sm mt-1">Review and approve new organizations applying to join QueueLess.</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchPendingData} disabled={loading}>Refresh</Button>
            </div>
            
            {pendingOrgs.length === 0 ? (
              <Card className="border-dashed border-2 bg-slate-50/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-slate-900 mb-1">All Caught Up</h3>
                  <p className="text-slate-500 text-sm">There are no pending organisation requests.</p>
                </CardContent>
              </Card>
            ) : (
              pendingOrgs.map(org => (
                <Card key={org._id} className="overflow-hidden border-slate-200">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{org.name}</h3>
                      <div className="flex gap-2 text-sm text-slate-500 mt-1">
                        <span className="bg-white border px-2 py-0.5 rounded-md text-xs font-medium">{org.type}</span>
                        <span>•</span>
                        <span>{org.address?.city || 'No Location specified'}</span>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-slate-500">Submitted</p>
                      <p className="font-medium">{new Date(org.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-2">Contact Information</h4>
                        <p className="text-sm text-slate-600">Email: {org.contactEmail || 'N/A'}</p>
                        <p className="text-sm text-slate-600">Phone: {org.contactPhone || 'N/A'}</p>
                        <p className="text-sm text-slate-600 mt-2">Submitted By: {org.owner?.name} ({org.owner?.email})</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-2">Operating Details</h4>
                        <p className="text-sm text-slate-600">Working Hours: {org.businessHours?.open} - {org.businessHours?.close}</p>
                        <p className="text-sm text-slate-600 mt-2">Address:<br/>{org.address?.street}<br/>{org.address?.city}, {org.address?.state} {org.address?.zipCode}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50 p-4 border-t flex justify-end gap-3">
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => {
                      const reason = window.prompt("Enter rejection reason:");
                      if (reason !== null) handleVerifyOrg(org._id, 'rejected', reason);
                    }}>
                      Reject
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleVerifyOrg(org._id, 'approved')}>
                      Approve Organisation
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        ) : activeTab === 'staff' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Staff Requests</h1>
                <p className="text-slate-500 text-sm mt-1">Review and approve staff members requesting access to organizations.</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchPendingData} disabled={loading}>Refresh</Button>
            </div>
            
            {pendingStaff.length === 0 ? (
              <Card className="border-dashed border-2 bg-slate-50/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-slate-900 mb-1">All Caught Up</h3>
                  <p className="text-slate-500 text-sm">There are no pending staff requests.</p>
                </CardContent>
              </Card>
            ) : (
              pendingStaff.map(staff => (
                <Card key={staff._id} className="overflow-hidden border-slate-200 mb-4">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{staff.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">{staff.email}</p>
                      <p className="text-xs text-slate-400 mt-1">Requested: {new Date(staff.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-xs text-slate-500 mb-1">Requested Organization</p>
                      {staff.organizations?.length > 0 ? staff.organizations.map(o => (
                        <div key={o._id} className="text-right">
                          <span className="inline-block bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold mb-1">
                            {o.name}
                          </span>
                          <p className="text-xs text-slate-500">{o.type}</p>
                        </div>
                      )) : <span className="text-sm text-slate-400">None selected</span>}
                    </div>
                  </div>
                  <CardFooter className="bg-white p-4 flex justify-end gap-3">
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => handleVerifyStaff(staff._id, 'rejected')}>
                      Reject
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleVerifyStaff(staff._id, 'active')}>
                      Approve Staff
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        ) : (
          <Card className="border-dashed border-2 h-[400px]">
            <CardContent className="flex flex-col items-center justify-center h-full text-center">
              <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-xl font-medium text-slate-900 mb-2">Coming Soon</h3>
              <p className="text-slate-500 max-w-sm mb-6">
                The {tabs.find(t => t.id === activeTab)?.name} panel will be available in the next platform update.
              </p>
              <Button variant="outline" onClick={handleComingSoon}>Notify me when available</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
