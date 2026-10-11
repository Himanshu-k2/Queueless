import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/Card"
import { useAuth } from "../context/AuthContext"

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    const res = await register(name, email, password)
    
    if (res.success) {
      navigate('/dashboard')
    } else {
      setError(res.message || 'Failed to register')
    }
    
    setLoading(false)
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Create an account</CardTitle>
          <CardDescription className="text-center">
            Enter your details below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium leading-none">Full Name</label>
              <Input id="name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none">Email</label>
              <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none">Password</label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" isLoading={loading}>Sign Up</Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <span className="text-muted-foreground mr-1">Already have an account?</span>
          <Link to="/login/customer" className="text-primary hover:underline">Sign in</Link>
        </CardFooter>
      </Card>
    </div>
  )
}
