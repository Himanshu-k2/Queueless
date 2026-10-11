import React from "react"
import { Link } from "react-router-dom"
import { Button } from "../components/ui/Button"
import { CalendarCheck, Users, Zap } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col items-center bg-slate-50 min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="w-full px-4 py-24 text-center sm:px-6 lg:px-8 bg-gradient-to-b from-white to-slate-50 border-b border-slate-100">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-800 sm:text-5xl lg:text-6xl mb-6">
            Say goodbye to waiting rooms.
          </h1>
          <p className="mx-auto max-w-2xl text-xl leading-8 text-slate-500 font-light">
            Welcome to QueueLess. Book appointments and join digital queues from your phone.
          </p>
        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="flex gap-4">
            <Link to="/login/customer">
              <Button size="lg" className="px-8 text-base">
                Customer Login
              </Button>
            </Link>
            <Link to="/login/staff">
              <Button variant="outline" size="lg" className="px-8 text-base bg-white">
                Staff Login
              </Button>
            </Link>
          </div>
          <Link to="/register" className="text-sm font-medium text-primary hover:underline mt-2">
            Create Customer Account
          </Link>
        </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900">Digital Queues</h3>
            <p className="mt-2 text-slate-600">Join a queue from your phone and arrive just in time. No more crowded waiting rooms.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900">Easy Booking</h3>
            <p className="mt-2 text-slate-600">Schedule appointments in seconds with organizations you trust.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900">For Everyone</h3>
            <p className="mt-2 text-slate-600">Perfect for clinics, salons, offices, and anywhere people wait.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
