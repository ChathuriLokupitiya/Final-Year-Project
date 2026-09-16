import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/routes/ProtectedRoute';
import useAuthStore from './store/authStore';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import SocialCallback from './pages/auth/SocialCallback';
import CustomerHome from './pages/customer/home';
import CustomerServices from './pages/customer/services';
import CustomerServiceDetails from './pages/customer/services/ServiceDetails';
import CustomerConsultancy from './pages/customer/consultancy';
import CustomerAbout from './pages/customer/about';
import CustomerGallery from './pages/customer/gallery';
import CustomerContact from './pages/customer/contact';
import CustomerTerms from './pages/customer/terms';
import CustomerPrivacy from './pages/customer/privacy';
import CustomerDashboardLayout from './pages/customer/dashboard/CustomerDashboardLayout';
import DashboardProfile from './pages/customer/dashboard/DashboardProfile';
import DashboardRedeem from './pages/customer/dashboard/DashboardRedeem';
import DashboardAppointments from './pages/customer/dashboard/DashboardAppointments';
import DashboardWishlist from './pages/customer/dashboard/DashboardWishlist';
import DashboardConsultants from './pages/customer/dashboard/DashboardConsultants';
import DashboardReviews from './pages/customer/dashboard/DashboardReviews';
import DashboardNotifications from './pages/customer/dashboard/DashboardNotifications';
// TEMP: chatbot disabled
// import Chatbot from './components/common/Chatbot';
import GlobalAlert from './components/common/GlobalAlert';
import ScrollToTop from './components/common/ScrollToTop';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import Appointments from './pages/admin/Appointments';
import StaffManagement from './pages/admin/StaffManagement';
import ServiceManagement from './pages/admin/ServiceManagement';
import GalleryManagement from './pages/admin/GalleryManagement';
import CustomerManagement from './pages/admin/CustomerManagement';
import PromotionsManagement from './pages/admin/PromotionsManagement';
import Settings from './pages/admin/Settings';
import AdminProfile from './pages/admin/AdminProfile';
// TEMP: operational reports disabled
// import ReportsManagement from './pages/admin/ReportsManagement';
import StaffLeave from './pages/admin/StaffLeave';
import AdminReviews from './pages/admin/AdminReviews';

function App() {
  const { fetchUser, token, user } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      fetchUser();
    }
  }, [token, user, fetchUser]);

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Main Landing Pages (Render own Nav/Footer) */}
        <Route path="/" element={<CustomerHome />} />
        <Route path="/services" element={<CustomerServices />} />
        <Route path="/services/:id" element={<CustomerServiceDetails />} />
        <Route path="/consultancy" element={<CustomerConsultancy />} />
        <Route path="/about" element={<CustomerAbout />} />
        <Route path="/gallery" element={<CustomerGallery />} />
        <Route path="/contact" element={<CustomerContact />} />
        <Route path="/terms" element={<CustomerTerms />} />
        <Route path="/privacy" element={<CustomerPrivacy />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/profile" element={<Navigate to="/dashboard/profile" replace />} />

        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/auth/social-callback" element={<SocialCallback />} />
        </Route>

        {/* Protected Customer Routes */}
        <Route element={<ProtectedRoute allowedRoles={['customer', 'admin', 'staff']} />}>
          {/* CustomerHome renders its own Navigation and Footer */}
          <Route path="/customer/home" element={<CustomerHome />} />
          
          {/* Dashboard Layout and Nested Routes */}
          <Route path="/dashboard" element={<CustomerDashboardLayout />}>
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<DashboardProfile />} />
            <Route path="redeem" element={<DashboardRedeem />} />
            <Route path="appointments" element={<DashboardAppointments />} />
            <Route path="wishlist" element={<DashboardWishlist />} />
            <Route path="consultants" element={<DashboardConsultants />} />
            <Route path="reviews" element={<DashboardReviews />} />
            <Route path="notifications" element={<DashboardNotifications />} />
          </Route>
        </Route>

        {/* Protected Admin/Staff Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'staff']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="customers" element={<CustomerManagement />} />
            <Route path="services" element={<ServiceManagement />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="my-leaves" element={<StaffLeave />} />
            <Route path="gallery" element={<GalleryManagement />} />
            <Route path="promotions" element={<PromotionsManagement />} />
            <Route path="payments" element={<div><h2>Manage Payments (Coming Soon)</h2></div>} />
            {/* TEMP: operational reports disabled */}
            {/* <Route path="reports" element={<ReportsManagement />} /> */}
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>
        </Route>
      </Routes>
      {/* TEMP: chatbot disabled */}
      {/* <Chatbot /> */}
      <GlobalAlert />
    </Router>
  );
}

export default App;
