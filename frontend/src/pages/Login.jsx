import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/Card"
import { useAuth } from "../context/AuthContext"

export default function Login({ type = 'customer' }) {
  const navigate = useNavigate()
  const { login } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    const res = await login(email, password)
    
    if (res.success) {
      if (res.role === 'admin') navigate('/admin')
      else if (res.role === 'staff') navigate('/staff')
      else if (res.role === 'customer') navigate('/dashboard')
      else navigate('/') // fallback
    } else {
      setError(res.message || 'Failed to login')
    }
    
    setLoading(false)
  }

  const isStaff = type === 'staff';

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {isStaff ? 'Staff & Admin Login' : 'Customer Login'}
          </CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your {isStaff ? 'workspace' : 'account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none">Email</label>
              <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none">Password</label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" isLoading={loading}>Sign In</Button>
          </form>
        </CardContent>
        {!isStaff ? (
          <CardFooter className="flex justify-center text-sm">
            <span className="text-muted-foreground mr-1">Don't have an account?</span>
            <Link to="/register" className="text-primary hover:underline">Create Customer Account</Link>
          </CardFooter>
        ) : (
          <CardFooter className="flex justify-center text-sm">
            <span className="text-muted-foreground mr-1">Want to join a clinic/organization?</span>
            <Link to="/register-staff" className="text-primary hover:underline">Staff Registration</Link>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
