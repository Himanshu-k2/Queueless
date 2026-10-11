import React, { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/Card"

export default function RegisterStaff() {
  const navigate = useNavigate()
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [organization, setOrganization] = useState('')
  const [organizations, setOrganizations] = useState([])
  const [orgFilter, setOrgFilter] = useState('')
  
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const filteredOrgs = organizations.filter(org => {
    if (orgFilter && org.type !== orgFilter) return false;
    return true;
  })

  useEffect(() => {
    fetch('/api/organizations')
      .then(r => r.json())
      .then(data => {
        if(Array.isArray(data)) setOrganizations(data)
      })
  }, [])

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    
    try {
      const res = await fetch('/api/users/register-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, organization })
      })
      let data = {}
      if (res.headers.get("content-type")?.includes("application/json")) {
        data = await res.json()
      }
      
      if (res.ok) {
        setSuccess('Registration submitted! Your account is pending admin approval. You will not be able to log in until approved.')
        setTimeout(() => navigate('/login/staff'), 5000)
      } else {
        setError(data.message || 'Failed to register')
      }
    } catch (err) {
      setError('Connection error')
    }
    
    setLoading(false)
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Staff Registration</CardTitle>
          <CardDescription className="text-center">
            Apply for staff access to an organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="bg-green-50 text-green-700 p-4 rounded-md text-sm text-center">
              {success}
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {error && <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
              
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Full Name</label>
                <Input placeholder="Jane Doe" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Email</label>
                <Input type="email" placeholder="staff@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Phone</label>
                <Input type="tel" placeholder="+1234567890" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Password</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              
              <div className="space-y-4 pt-2 border-t">
                <label className="text-sm font-medium leading-none">Select Organization</label>
                
                <div className="flex gap-2">
                  <select 
                    className="w-1/3 border rounded-md p-2 h-10 bg-transparent text-sm"
                    value={orgFilter}
                    onChange={e => {
                      setOrgFilter(e.target.value)
                      setOrganization('')
                    }}
                  >
                    <option value="">All Types</option>
                    <option value="Hospital">Hospital</option>
                    <option value="Bank">Bank</option>
                    <option value="College">College</option>
                    <option value="University">University</option>
                    <option value="Diagnostic Lab">Diagnostic Lab</option>
                    <option value="Government Service">Government Service</option>
                    <option value="Other">Other</option>
                  </select>
                  
                  <select 
                    className="flex-1 border rounded-md p-2 h-10 bg-transparent text-sm" 
                    value={organization} 
                    onChange={e => setOrganization(e.target.value)}
                    required
                  >
                    <option value="">-- Choose an Organization --</option>
                    {filteredOrgs.map(org => (
                      <option key={org._id} value={org._id}>{org.name} ({org.address?.city})</option>
                    ))}
                  </select>
                </div>
                {organizations.length > 0 && filteredOrgs.length === 0 && (
                  <p className="text-xs text-amber-600">No organizations found for this type.</p>
                )}
              </div>

              <Button type="submit" className="w-full mt-4" isLoading={loading}>Submit Registration</Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <Link to="/login/staff" className="text-primary hover:underline">Back to Staff Login</Link>
        </CardFooter>
      </Card>
    </div>
  )
}
