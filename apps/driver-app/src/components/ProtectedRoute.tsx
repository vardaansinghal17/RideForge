import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useDriverRideStore } from '../stores/driverRideStore';
import { Layout } from './Layout';

interface ProtectedRouteProps {
  allowedRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRole }) => {
  const { accessToken, user } = useAuthStore();
  const { connect, disconnect } = useDriverRideStore();

  useEffect(() => {
    if (accessToken) {
      connect(accessToken);
    } else {
      disconnect();
    }
  }, [accessToken, connect, disconnect]);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  // Ensure role matches (case insensitive check for safety)
  if (allowedRole && user?.role?.toUpperCase() !== allowedRole.toUpperCase()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};
