import React, { useState, useEffect } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/Card"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useNetwork } from "../context/NetworkContext"
import { savePendingAction } from "../utils/idb"

export default function BookAppointment() {
  const navigate = useNavigate()
  const { serviceId } = useParams()
  const location = useLocation()
  const orgId = location.state?.orgId
  const rescheduleId = location.state?.rescheduleId
  const { user } = useAuth()
  const { isOnline, reportLocalSave } = useNetwork()
  
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Generate next 7 days for selection
  const generateDates = () => {
    const dates = []
    for(let i=0; i<7; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      dates.push(d.toISOString().split('T')[0])
    }
    return dates
  }
  const dates = generateDates()

  useEffect(() => {
    if (!selectedDate || !orgId) return;
    
    setLoading(true)
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
      ];
      setSlots(genericSlots)
      setSelectedTime("")
      setLoading(false)
      return
    }

    fetch(`/api/appointments/available-slots?orgId=${orgId}&serviceId=${serviceId}&date=${selectedDate}`)
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status !== 200) throw new Error(data.message || "Failed to fetch slots")
        setSlots(data)
        setSelectedTime("")
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setSlots([])
        setLoading(false)
      })
  }, [selectedDate, orgId, serviceId, isOnline])

  const handleBook = async () => {
    if (!orgId) {
      setError("Organization information missing. Please return to the services list.")
      return
    }
    
    setLoading(true)
    setError("")

    const url = rescheduleId ? `/api/appointments/${rescheduleId}/reschedule` : '/api/appointments'
    const method = rescheduleId ? 'PUT' : 'POST'
    const payload = {
      organization: orgId,
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
      navigate("/dashboard", { state: { message: "Saved on this device. Will confirm when online." } })
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
      
      navigate("/dashboard", { state: { message: `Appointment confirmed by QueueLess!` } })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>{rescheduleId ? 'Reschedule Appointment' : 'Book Appointment'}</CardTitle>
          <CardDescription>Select a date and time to secure your appointment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
          
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center">
              <CalendarIcon className="mr-2 h-5 w-5 text-primary" /> Select Date
            </h3>
            <div className="flex flex-wrap gap-2">
              {dates.map((date) => (
                <Button 
                  key={date} 
                  variant={selectedDate === date ? "default" : "outline"}
                  onClick={() => setSelectedDate(date)}
                >
                  {new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </Button>
              ))}
            </div>
          </div>

          {selectedDate && (
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <Clock className="mr-2 h-5 w-5 text-primary" /> Select Time
              </h3>
              {loading ? (
                <p className="text-sm text-muted-foreground">Finding available slots...</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-amber-600 font-medium">No slots available for this date. Please try another date.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot) => (
                    <Button 
                      key={slot.time24} 
                      variant={selectedTime === slot.time24 ? "default" : "outline"}
                      onClick={() => setSelectedTime(slot.time24)}
                    >
                      {slot.time12}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t p-6">
          <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button disabled={!selectedDate || !selectedTime || loading} onClick={handleBook} isLoading={loading}>
            {rescheduleId ? 'Confirm Reschedule' : 'Confirm Booking'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
