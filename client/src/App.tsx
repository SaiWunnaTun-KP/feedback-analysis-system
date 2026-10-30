import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import AdminLoginPage from './pages/AdminLoginPage';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { UserDashboardLayout } from './layouts/UserDashboardLayout';
import { Toaster } from '@/components/ui/sonner';

const queryClient = new QueryClient();

import Overview from './pages/user/Overview';
import Datasets from './pages/user/Datasets';
import Reports from './pages/user/Reports';
import ProductDetailPage from './pages/user/ProductDetailPage';
import Subscriptions from './pages/user/Subscriptions';
import Settings from './pages/user/Settings';
import HelpSupport from './pages/user/HelpSupport';
import UserPolicies from './pages/user/UserPolicies';
import AdminDashboard from './pages/AdminDashboard';
import LandingPage from './pages/LandingPage';
import PublicPoliciesPage from './pages/PublicPoliciesPage';
import { ScrollToTop } from './components/ScrollToTop';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              {/* Public Pages */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/terms" element={<PublicPoliciesPage defaultTab="terms" />} />
              <Route path="/privacy" element={<PublicPoliciesPage defaultTab="privacy" />} />

              {/* Public Auth Routes - Restricted from Authenticated Users (AuthRedirect guard) */}
              <Route element={<PublicRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/register" element={<Register />} />
              </Route>

              {/* Protected Routes - Retail Manager */}
              <Route element={<ProtectedRoute allowedRoles={['RETAIL_MANAGER']} />}>
                <Route element={<UserDashboardLayout />}>
                  <Route path="/dashboard" element={<Overview />} />
                  <Route path="/dashboard/datasets" element={<Datasets />} />
                  <Route path="/dashboard/reports" element={<Reports />} />
                  <Route path="/dashboard/reports/:datasetId/product/:productName" element={<ProductDetailPage />} />
                  <Route path="/dashboard/reports/product/:productName" element={<ProductDetailPage />} />
                  <Route path="/dashboard/subscriptions" element={<Subscriptions />} />
                  <Route path="/dashboard/settings" element={<Settings />} />
                  <Route path="/dashboard/help" element={<HelpSupport />} />
                  <Route path="/dashboard/terms" element={<UserPolicies />} />
                </Route>
              </Route>

              {/* Protected Routes - Admin */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/admin" element={<AdminDashboard tab="plans" />} />
                  <Route path="/admin/plans" element={<Navigate to="/admin" replace />} />
                  <Route path="/admin/feedbacks" element={<AdminDashboard tab="feedbacks" />} />
                  <Route path="/admin/users" element={<AdminDashboard tab="users" />} />
                  <Route path="/admin/faqs" element={<AdminDashboard tab="faqs" />} />
                  <Route path="/admin/terms" element={<AdminDashboard tab="policies" />} />
                </Route>
              </Route>

              {/* Fallback unknown route redirects to landing page */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
