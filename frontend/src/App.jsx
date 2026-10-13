import React from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { MainLayout } from "./components/layout/MainLayout"
import ProtectedRoute from "./components/layout/ProtectedRoute"

// Pages
import Home from "./pages/Home"
import Login from "./pages/Login"
import Register from "./pages/Register"
import RegisterStaff from "./pages/RegisterStaff"
import RegisterOrganization from "./pages/RegisterOrganization"
import CustomerDashboard from "./pages/CustomerDashboard"
import Organizations from "./pages/Organizations"
import Services from "./pages/Services"
import BookAppointment from "./pages/BookAppointment"
import QueueStatus from "./pages/QueueStatus"
import StaffDashboard from "./pages/StaffDashboard"
import AdminDashboard from "./pages/AdminDashboard"
import CustomerProfile from "./pages/CustomerProfile"

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="login/customer" element={<Login type="customer" />} />
          <Route path="login/staff" element={<Login type="staff" />} />
          <Route path="register" element={<Register />} />
          <Route path="register-staff" element={<RegisterStaff />} />
          
          {/* Public or common authenticated routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="organizations" element={<Organizations />} />
            <Route path="organizations/:orgId/services" element={<Services />} />
            <Route path="register-organization" element={<RegisterOrganization />} />
            <Route path="services/:serviceId/book" element={<BookAppointment />} />
            <Route path="queue/:ticketId" element={<QueueStatus />} />
            <Route path="profile" element={<CustomerProfile />} />
          </Route>

          {/* Customer Routes */}
          <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
            <Route path="dashboard" element={<CustomerDashboard />} />
          </Route>

          {/* Staff Routes */}
          <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
            <Route path="staff" element={<StaffDashboard />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="admin" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  )
}

export default App
