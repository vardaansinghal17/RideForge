import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div
      className="min-h-screen py-8 px-4 flex flex-col items-center justify-start relative overflow-hidden"
      style={{
        background: 'radial-gradient(circle at center, #FFFFFF 0%, #F1F5F9 100%)',
      }}
    >
      {/* Background Visual Glows */}
      <div className="absolute top-1/4 left-1/4 w-[250px] h-[250px] bg-[#FF5A1F]/5 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md space-y-6 fade-up">
        {/* Back and Title Header */}
        <div className="flex items-center space-x-3 text-left">
          <Button variant="icon" onClick={() => navigate('/')}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-5 h-5 text-[var(--rx-text)]"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-[var(--rx-text)]">Profile</h1>
            <p className="text-xs text-[var(--rx-text-3)]">Manage your RideForge account</p>
          </div>
        </div>

        {/* Profile Details Card */}
        <GlassCard className="text-center" strong>
          {/* Avatar circle */}
          <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-tr from-[#FF5A1F] to-orange-600 flex items-center justify-center text-white font-extrabold text-3xl shadow-[0_0_25px_rgba(255,90,31,0.25)] mb-5 select-none">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>

          <h2 className="text-xl font-bold text-[var(--rx-text)] mb-0.5">{user?.name || 'Rider Name'}</h2>
          <p className="text-xs text-[#FF5A1F] font-semibold uppercase tracking-wider mb-6">
            Verified Rider
          </p>

          {/* Details list */}
          <div className="space-y-4 text-left border-t border-[var(--rx-border)] pt-5 mb-8">
            <div className="flex justify-between items-center py-1">
              <span className="text-xs text-[var(--rx-text-3)] font-medium">Phone Number</span>
              <span className="text-sm text-[var(--rx-text-1)] font-semibold">
                {user?.phone || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-xs text-[var(--rx-text-3)] font-medium">Email Address</span>
              <span className="text-sm text-[var(--rx-text-1)] font-semibold">
                {user?.email || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-xs text-[var(--rx-text-3)] font-medium">User Role</span>
              <span className="text-xs font-bold uppercase bg-[#FF5A1F]/10 text-[#FF5A1F] px-2 py-0.5 rounded border border-[#FF5A1F]/20">
                {user?.role || 'RIDER'}
              </span>
            </div>
          </div>

          {/* Logout button */}
          <Button variant="danger" className="w-full h-[50px] !rounded-xl" onClick={handleLogout}>
            Log Out Account
          </Button>
        </GlassCard>
      </div>
    </div>
  );
}
