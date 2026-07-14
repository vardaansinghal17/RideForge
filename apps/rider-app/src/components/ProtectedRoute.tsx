import { useEffect } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useRideStore } from '../stores/rideStore';
import { api } from '../lib/axios';

interface Props {
  allowedRole?: 'RIDER' | 'DRIVER' | 'ADMIN';
}

export function ProtectedRoute({ allowedRole }: Props) {
  const { user, accessToken } = useAuthStore();
  const { connect, socket, ride } = useRideStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (accessToken && !socket) {
      connect(accessToken);
    }
  }, [accessToken, socket, connect]);

  // Restores active ride state on page load or refresh
  useEffect(() => {
    if (accessToken && !ride) {
      api.get('/rides/active')
        .then((res) => {
          const activeRide = res.data.data;
          if (activeRide) {
            useRideStore.setState({
              ride: activeRide,
              driverInfo: activeRide,
              driverLocation: activeRide.driver_lat && activeRide.driver_lng ? {
                lat: Number(activeRide.driver_lat),
                lng: Number(activeRide.driver_lng)
              } : null
            });

            // If the user is on the main/booking screens, direct them to their active ride status
            if (['/', '/ride', '/searching', '/active-ride'].includes(location.pathname)) {
              if (activeRide.status === 'REQUESTED') {
                navigate('/searching', { replace: true });
              } else if (['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(activeRide.status)) {
                navigate('/active-ride', { replace: true });
              }
            }
          }
        })
        .catch((err) => {
          console.error('Failed to fetch active ride:', err);
        });
    }
  }, [accessToken, ride, navigate, location.pathname]);

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}