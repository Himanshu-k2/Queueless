import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/Card"

export default function RegisterOrganization() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [formData, setFormData] = useState({
    name: '', type: 'Hospital', street: '', city: '', state: '', zipCode: '', contactEmail: '', contactPhone: '', open: '09:00', close: '17:00'
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      setError('You must be logged in to register an organization.');
      return;
    }
    setError('')
    setSuccess('')
    setLoading(true)
    
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ 
          name: formData.name, 
          type: formData.type, 
          address: { street: formData.street, city: formData.city, state: formData.state, zipCode: formData.zipCode },
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
          businessHours: { open: formData.open, close: formData.close }
        })
      })
      let data = {}
      if (res.headers.get("content-type")?.includes("application/json")) {
        data = await res.json()
      }
      
      if (res.ok) {
        setSuccess('Organization request submitted successfully! It is pending Admin review.')
        setTimeout(() => navigate('/dashboard'), 3000)
      } else {
        setError(data.message || 'Failed to submit request')
      }
    } catch (err) {
      setError('Connection error')
    }
    
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Register Your Organisation</CardTitle>
          <CardDescription>
            Submit a request to list your organisation on QueueLess. It will be reviewed by an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="bg-green-50 text-green-700 p-6 rounded-md text-center font-medium">
              {success}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Organisation Name</label>
                  <Input name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <select name="type" className="w-full border rounded-md p-2 h-10 bg-transparent text-sm" value={formData.type} onChange={handleChange}>
                    <option>Hospital</option>
                    <option>Bank</option>
                    <option>College</option>
                    <option>Diagnostic Lab</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-semibold">Location & Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-500">Street</label>
                    <Input name="street" value={formData.street} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-500">City</label>
                    <Input name="city" value={formData.city} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-500">Email</label>
                    <Input name="contactEmail" type="email" value={formData.contactEmail} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-500">Phone</label>
                    <Input name="contactPhone" type="tel" value={formData.contactPhone} onChange={handleChange} required />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-semibold">Working Hours</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-500">Opening Time</label>
                    <Input name="open" type="time" value={formData.open} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-500">Closing Time</label>
                    <Input name="close" type="time" value={formData.close} onChange={handleChange} required />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" isLoading={loading}>Submit for Verification</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
