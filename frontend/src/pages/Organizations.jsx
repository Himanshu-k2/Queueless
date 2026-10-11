import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Card, CardContent, CardFooter } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Search, MapPin, Building, Crosshair, Clock, ChevronRight } from "lucide-react"

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function Organizations() {
  const [organizations, setOrganizations] = useState([])
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Geolocation
  const [userLocation, setUserLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  
  // Map center defaults to India (or dynamically updates based on first org)
  const [mapCenter, setMapCenter] = useState([22.8046, 86.2029])

  const fetchOrganizations = async (lat = null, lng = null) => {
    setLoading(true)
    setError(null)
    try {
      let url = `/api/organizations?`
      if (search) url += `search=${encodeURIComponent(search)}&`
      if (type) url += `type=${encodeURIComponent(type)}&`
      if (lat && lng) url += `lat=${lat}&lng=${lng}&`
      
      const res = await fetch(url)
      const data = await res.json()
      
      if (res.ok) {
        setOrganizations(data)
        if (data.length > 0 && !lat) {
          // Center map to first result if not using user location
          const firstValid = data.find(o => o.location && o.location.latitude)
          if (firstValid) setMapCenter([firstValid.location.latitude, firstValid.location.longitude])
        }
      } else {
        setError(data.message || 'Failed to fetch organisations')
      }
    } catch (err) {
      setError('Connection error. Please try again later.')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrganizations(userLocation?.lat, userLocation?.lng)
  }, [type])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchOrganizations(userLocation?.lat, userLocation?.lng)
  }

  const handleUseLocation = () => {
    setLocating(true)
    setError(null)
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      setLocating(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ lat: latitude, lng: longitude })
        setMapCenter([latitude, longitude])
        fetchOrganizations(latitude, longitude)
        setLocating(false)
      },
      () => {
        setError('Location access was denied. You can still search by city instead.')
        setLocating(false)
      }
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-6">
      
      {/* Sidebar: Search & Filters */}
      <div className="w-full md:w-80 flex-shrink-0 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Discover Services</h1>
          <p className="text-sm text-slate-500 mb-6">Find QueueLess enabled hospitals, banks, and public services near you.</p>
          
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search hospitals, banks, city..." 
                className="pl-9 bg-white" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Organisation Type</label>
              <select 
                className="w-full border-slate-200 rounded-md p-2 text-sm bg-white border"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="Hospital">Hospital</option>
                <option value="Bank">Bank</option>
                <option value="Diagnostic Lab">Diagnostic Lab</option>
                <option value="College">College / University</option>
                <option value="Government Service">Government Service</option>
              </select>
            </div>

            <Button type="submit" className="w-full">Search</Button>
          </form>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <Button 
            variant="outline" 
            className="w-full bg-slate-50 border-primary/20 text-primary hover:bg-primary/5" 
            onClick={handleUseLocation}
            isLoading={locating}
          >
            <Crosshair className="mr-2 h-4 w-4" />
            {userLocation ? 'Update My Location' : 'Use My Location'}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-6">
        
        {error && (
          <div className="bg-amber-50 text-amber-800 p-4 rounded-md text-sm border border-amber-200 flex items-start">
            <MapPin className="h-5 w-5 mr-3 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Map Container */}
        <div className="h-64 w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative z-0 shadow-inner">
          <MapContainer center={mapCenter} zoom={12} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                <Popup>You are here</Popup>
              </Marker>
            )}

            {organizations.map((org) => org.location && org.location.latitude && (
              <Marker key={org._id} position={[org.location.latitude, org.location.longitude]}>
                <Popup className="custom-popup">
                  <div className="font-sans">
                    <h3 className="font-bold text-sm mb-1">{org.name}</h3>
                    <p className="text-xs text-slate-500 mb-2">{org.type} • {org.distance ? `${org.distance.toFixed(1)} km away` : org.address?.city}</p>
                    <Link to={`/organizations/${org._id}/services`} className="text-primary text-xs font-semibold hover:underline flex items-center">
                      View Services <ChevronRight className="h-3 w-3 ml-1" />
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Organisation Cards */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {organizations.length} {organizations.length === 1 ? 'Organisation' : 'Organisations'} Found
          </h2>
          
          {loading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => (
                <Card key={i} className="animate-pulse bg-slate-50 h-40"></Card>
              ))}
            </div>
          ) : organizations.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed">
              <Building className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-900">No organisations found</h3>
              <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or searching a different area.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {organizations.map(org => (
                <Card key={org._id} className="flex flex-col hover:border-primary/50 transition-colors shadow-sm">
                  <CardContent className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                        {org.type}
                      </span>
                      {org.distance !== undefined && org.distance !== null && org.distance < 999999 && (
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {org.distance.toFixed(1)} km
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-1 mb-1">{org.name}</h3>
                    <p className="text-sm text-slate-500 mb-3 line-clamp-2 min-h-[40px]">{org.description}</p>
                    
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                        {org.address?.city}, {org.address?.state}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-slate-400" />
                        {org.businessHours?.open} - {org.businessHours?.close}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-5 pt-0 mt-auto">
                    <Link to={`/organizations/${org._id}/services`} className="w-full">
                      <Button className="w-full">View Details & Book</Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  )
}
