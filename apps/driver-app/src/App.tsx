import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from './components/ProtectedRoute';

// Import Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ActiveRidePage from './pages/ActiveRidePage';
import RateRiderPage from './pages/RateRiderPage';
import EarningsPage from './pages/EarningsPage';
import HistoryPage from './pages/HistoryPage';
import RatingsPage from './pages/RatingsPage';
import ProfilePage from './pages/ProfilePage';
import VehicleSetupPage from './pages/VehicleSetupPage';

// Create React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Driver Routes */}
          <Route element={<ProtectedRoute allowedRole="DRIVER" />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/active-ride" element={<ActiveRidePage />} />
            <Route path="/rate-rider/:rideId" element={<RateRiderPage />} />
            <Route path="/earnings" element={<EarningsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/ratings" element={<RatingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/vehicle-setup" element={<VehicleSetupPage />} />
          </Route>

          {/* Fallback Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
