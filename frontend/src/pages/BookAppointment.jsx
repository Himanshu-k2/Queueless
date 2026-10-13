import React, { useState, useEffect } from "react"
import { useNavigate, useParams, useLocation, Link } from "react-router-dom"
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/Card"
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Building2, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  CalendarCheck
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useNetwork } from "../context/NetworkContext"
import { savePendingAction } from "../utils/idb"

export default function BookAppointment() {
  const navigate = useNavigate()
  const { serviceId } = useParams()
  const location = useLocation()
  const initialOrgId = location.state?.orgId
  const rescheduleId = location.state?.rescheduleId
  const { user } = useAuth()
  const { isOnline, reportLocalSave } = useNetwork()
  
  const [serviceDetails, setServiceDetails] = useState(null)
  const [orgId, setOrgId] = useState(initialOrgId || "")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loadingService, setLoadingService] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [confirmedBooking, setConfirmedBooking] = useState(null)

  // 1. Fetch Service and Organization details if not present or to display service metadata
  useEffect(() => {
    let isMounted = true
    const fetchService = async () => {
      try {
        const res = await fetch(`/api/services/${serviceId}`)
        if (res.ok) {
          const data = await res.json()
          if (isMounted) {
            setServiceDetails(data)
            if (!orgId && data.organization) {
              setOrgId(typeof data.organization === 'object' ? data.organization._id : data.organization)
            }
          }
        } else {
          // Fallback if not found
          console.warn("Could not fetch detailed service information")
        }
      } catch (err) {
        console.error("Error fetching service info:", err)
      } finally {
        if (isMounted) setLoadingService(false)
      }
    }

    fetchService()
    return () => { isMounted = false }
  }, [serviceId])

  // Generate next 14 days dynamically
  const generateDates = () => {
    const dates = []
    const now = new Date()
    for (let i = 0; i < 14; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      dates.push({
        dateStr,
        dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString(undefined, { month: 'short' })
      })
    }
    return dates
  }
  const dates = generateDates()

  // Set default date to today once mounted
  useEffect(() => {
    if (!selectedDate && dates.length > 0) {
      setSelectedDate(dates[0].dateStr)
    }
  }, [])

  // Fetch available slots when selectedDate or orgId changes
  useEffect(() => {
    if (!selectedDate || (!orgId && !serviceId)) return
    
    setLoadingSlots(true)
    setError("")

    if (!isOnline) {
      // Provide generic offline slots if disconnected
      const genericSlots = [
        { time12: '09:00 AM', time24: '09:00' },
        { time12: '10:00 AM', time24: '10:00' },
        { time12: '11:00 AM', time24: '11:00' },
        { time12: '01:00 PM', time24: '13:00' },
        { time12: '02:00 PM', time24: '14:00' },
        { time12: '03:00 PM', time24: '15:00' },
      ]
      setSlots(genericSlots)
      setSelectedTime("")
      setLoadingSlots(false)
      return
    }

    let url = `/api/appointments/available-slots?serviceId=${serviceId}&date=${selectedDate}`
    if (orgId) url += `&orgId=${orgId}`

    fetch(url)
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status !== 200) throw new Error(data.message || "Failed to fetch slots")
        setSlots(Array.isArray(data) ? data : [])
        setSelectedTime("")
        setLoadingSlots(false)
      })
      .catch(err => {
        setError(err.message)
        setSlots([])
        setLoadingSlots(false)
      })
  }, [selectedDate, orgId, serviceId, isOnline])

  const handleBook = async () => {
    const targetOrgId = orgId || (serviceDetails?.organization?._id || serviceDetails?.organization)
    if (!targetOrgId) {
      setError("Organization information missing. Please return to the services list.")
      return
    }

    if (!selectedDate || !selectedTime) {
      setError("Please select both a date and a time slot.")
      return
    }
    
    setSubmitting(true)
    setError("")

    const url = rescheduleId ? `/api/appointments/${rescheduleId}/reschedule` : '/api/appointments'
    const method = rescheduleId ? 'PUT' : 'POST'
    const payload = {
      organization: targetOrgId,
      service: serviceId,
      date: selectedDate,
      time: selectedTime
    }

    if (!isOnline) {
      await savePendingAction({
        url,
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      })
      await reportLocalSave()
      navigate("/dashboard", { state: { message: "Saved locally on this device. QueueLess will confirm once reconnected." } })
      return
    }
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.message || `Failed to ${rescheduleId ? 'reschedule' : 'book'} appointment`)
      }

      // Successful confirmation
      setConfirmedBooking(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Format organization name
  const orgName = serviceDetails?.organization?.name || "Service Provider"
  const orgType = serviceDetails?.organization?.type || "Service"
  const serviceName = serviceDetails?.name || "Consultation"
  const duration = serviceDetails?.estimatedDuration || 15

  // Booking Confirmation View
  if (confirmedBooking) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="border-green-200 bg-white shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-white text-center">
            <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/40">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Appointment Confirmed!</h2>
            <p className="text-green-100 text-sm mt-1">Confirmed by QueueLess Real-Time Booking Engine</p>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Booking Token</span>
              <p className="text-3xl font-extrabold font-mono text-primary mt-1">{confirmedBooking.tokenNumber}</p>
              <p className="text-xs text-slate-400 mt-1">Show this token upon arrival or check in via your dashboard</p>
            </div>

            <div className="divide-y divide-slate-100 text-sm">
              <div className="py-3 flex justify-between">
                <span className="text-slate-500">Organization</span>
                <span className="font-semibold text-slate-900">{orgName} ({orgType})</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-500">Service</span>
                <span className="font-semibold text-slate-900">{serviceName}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-500">Scheduled Date</span>
                <span className="font-semibold text-slate-900">
                  {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-500">Scheduled Time</span>
                <span className="font-semibold text-slate-900">{selectedTime}</span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-slate-50/80 border-t p-6 flex flex-col sm:flex-row gap-3">
            <Link to="/dashboard" className="w-full sm:w-1/2">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
            <Link to="/organizations" className="w-full sm:w-1/2">
              <Button variant="outline" className="w-full bg-white">Book Another</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link 
        to={orgId ? `/organizations/${orgId}/services` : "/organizations"} 
        className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Services
      </Link>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                  {orgType}
                </span>
                <span className="text-xs text-slate-400">~{duration} min duration</span>
              </div>
              <CardTitle className="text-xl sm:text-2xl mt-1.5">{serviceName}</CardTitle>
              <CardDescription className="flex items-center text-slate-600 mt-1">
                <Building2 className="h-4 w-4 mr-1 text-slate-400" />
                {orgName}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {error && (
            <div className="text-sm font-medium text-red-800 bg-red-50 border border-red-200 p-4 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-3 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {/* Date Picker */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center">
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" /> Select Date
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {dates.map(({ dateStr, dayName, dayNum, monthName }) => {
                const isSelected = selectedDate === dateStr
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border min-w-[72px] transition-all cursor-pointer ${
                      isSelected 
                        ? "bg-primary text-white border-primary shadow-xs scale-102" 
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-[11px] uppercase font-semibold opacity-80">{dayName}</span>
                    <span className="text-lg font-bold my-0.5">{dayNum}</span>
                    <span className="text-[11px] opacity-80">{monthName}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center">
                <Clock className="mr-2 h-4 w-4 text-primary" /> Select Available Time Slot
              </h3>
              {loadingSlots ? (
                <div className="p-8 text-center text-sm text-slate-400 animate-pulse">
                  Finding available slots for {new Date(selectedDate).toLocaleDateString()}...
                </div>
              ) : slots.length === 0 ? (
                <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-center">
                  <p className="text-sm font-semibold">No slots available for this date</p>
                  <p className="text-xs text-amber-700 mt-1">All time slots may be booked or outside working hours. Please select another date.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {slots.map((slot) => {
                    const isSelected = selectedTime === slot.time24
                    return (
                      <Button 
                        key={slot.time24} 
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => setSelectedTime(slot.time24)}
                        className={`h-11 text-xs font-semibold rounded-lg transition-all ${
                          isSelected ? "bg-primary text-white shadow-xs" : "bg-white hover:bg-slate-50 border-slate-200"
                        }`}
                      >
                        {slot.time12}
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-6">
          <Button variant="outline" onClick={() => navigate(-1)} className="bg-white">
            Cancel
          </Button>
          <Button 
            disabled={!selectedDate || !selectedTime || submitting || loadingSlots} 
            onClick={handleBook} 
            isLoading={submitting}
            className="px-6"
          >
            {rescheduleId ? 'Confirm Reschedule' : 'Confirm Booking'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
