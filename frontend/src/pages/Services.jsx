import React from "react"
import { Link, useParams } from "react-router-dom"
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/Card"
import { ArrowLeft, Clock, Calendar } from "lucide-react"

export default function Services() {
  const { orgId } = useParams()
  
  const [services, setServices] = React.useState([])
  const [organization, setOrganization] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    Promise.all([
      fetch(`/api/organizations/${orgId}`).then(res => res.json()),
      fetch(`/api/services/org/${orgId}`).then(res => res.json())
    ])
      .then(([orgData, servicesData]) => {
        setOrganization(orgData)
        if (Array.isArray(servicesData)) setServices(servicesData)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [orgId])

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading services...</div>
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/organizations" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary transition-colors mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Locations
      </Link>
      
      <div className="mb-8 border-b pb-6">
        <h1 className="text-3xl font-bold text-slate-900">{organization?.name}</h1>
        <p className="text-slate-600 mt-2">Select a service to join the queue or book an appointment.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {services.map((service) => (
          <Card key={service._id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{service.name}</CardTitle>
              <CardDescription>{service.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {service.type === "queue" ? (
                <div className="flex items-center text-sm text-amber-600 font-medium">
                  <Clock className="mr-2 h-4 w-4" />
                  Estimated wait: {service.estimatedDuration} mins
                </div>
              ) : (
                <div className="flex items-center text-sm text-primary font-medium">
                  <Calendar className="mr-2 h-4 w-4" />
                  Appointments Available
                </div>
              )}
            </CardContent>
            <CardFooter>
              {service.type === "queue" ? (
                <Link to={`/queue/new-${service._id}`} className="w-full">
                  <Button className="w-full">Join Queue</Button>
                </Link>
              ) : (
                <Link to={`/services/${service._id}/book`} state={{ orgId: orgId }} className="w-full">
                  <Button variant="outline" className="w-full">Book Appointment</Button>
                </Link>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
