import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../../backend/src/modules/auth/authStore';

interface Props {
  allowedRole?: 'RIDER' | 'DRIVER' | 'ADMIN';
}

export function ProtectedRoute({ allowedRole }: Props) {
  const { user, accessToken } = useAuthStore();

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}