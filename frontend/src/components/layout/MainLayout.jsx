import React from "react"
import { Link, useNavigate, Outlet } from "react-router-dom"
import { Clock, Wifi, WifiOff, CloudUpload, CheckCircle, AlertCircle, Save } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useNetwork } from "../../context/NetworkContext"
import ChatWidget from "../chat/ChatWidget"

export function NetworkStatusBar() {
  const { isOnline, syncStatus, pendingCount } = useNetwork();
  
  if (syncStatus === 'Online' && pendingCount === 0) return null; // hide when everything is fine

  let bgColor = "bg-amber-500";
  let icon = <WifiOff className="h-4 w-4 mr-2" />;
  
  if (syncStatus === 'Online') {
    bgColor = "bg-green-500";
    icon = <Wifi className="h-4 w-4 mr-2" />;
  } else if (syncStatus === 'Successfully synchronized') {
    bgColor = "bg-green-600";
    icon = <CheckCircle className="h-4 w-4 mr-2" />;
  } else if (syncStatus === 'Saved locally') {
    bgColor = "bg-blue-500";
    icon = <Save className="h-4 w-4 mr-2" />;
  } else if (syncStatus === 'Pending synchronization') {
    bgColor = "bg-blue-600";
    icon = <CloudUpload className="h-4 w-4 mr-2 animate-pulse" />;
  } else if (syncStatus === 'Synchronization failed') {
    bgColor = "bg-red-500";
    icon = <AlertCircle className="h-4 w-4 mr-2" />;
  } else if (!isOnline) {
    bgColor = "bg-slate-700";
  }

  return (
    <div className={`${bgColor} text-white text-xs font-medium py-1 px-4 flex items-center justify-center transition-colors duration-300 shadow-inner z-50 relative`}>
      {icon}
      <span>{syncStatus}</span>
      {pendingCount > 0 && syncStatus !== 'Successfully synchronized' && (
        <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{pendingCount} pending action(s)</span>
      )}
    </div>
  );
}

export function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center space-x-2 group">
          <Clock className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-xl font-bold text-slate-900 tracking-tight">QueueLess</span>
        </Link>
        <div className="flex items-center space-x-6">
          {user ? (
            <>
              <span className="text-sm font-medium text-slate-500">Hi, <span className="text-slate-800">{user.name.split(' ')[0]}</span></span>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login/customer" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Sign In
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 hover:shadow transition-all"
              >
                Create Account
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <NetworkStatusBar />
      <Navbar />
      <main className="flex-1 bg-gray-50/50">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} QueueLess. All rights reserved.
      </footer>
      <ChatWidget />
    </div>
  )
}
