import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { api } from '../lib/axios';

interface ProfileData {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
  profile: {
    id: string;
    rating: string | number | null;
    total_rides: number;
  } | null;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user: storeUser, logout } = useAuthStore();

  // Fetch full user profile details from backend
  const {
    data: meData,
    isLoading: isMeLoading,
    isError: isMeError,
    refetch: refetchMe,
  } = useQuery<ProfileData>({
    queryKey: ['authMe'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.data;
    },
  });

  // Fetch payment history to aggregate total spent
  const {
    data: paymentsData,
    isLoading: isPaymentsLoading,
  } = useQuery({
    queryKey: ['paymentHistoryAll'],
    queryFn: async () => {
      const res = await api.get('/payments/history?page=1&limit=100');
      return res.data.data;
    },
  });

  // Aggregate total spent from all loaded payments
  const totalSpent = useMemo(() => {
    if (!paymentsData?.payments) return 0;
    return paymentsData.payments.reduce((acc: number, p: any) => {
      return acc + parseFloat(p.final_fare || '0');
    }, 0);
  }, [paymentsData]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Derive initial values from Zustand store if query is pending
  const displayName = meData?.name || storeUser?.name || 'Rider';
  const displayPhone = meData?.phone || storeUser?.phone || 'N/A';
  const displayEmail = meData?.email || storeUser?.email || 'N/A';
  const displayRole = meData?.role || storeUser?.role || 'RIDER';

  // Format creation date
  const memberSince = useMemo(() => {
    const dateStr = meData?.created_at;
    if (!dateStr) return 'Active Partner';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'Active Partner';
    }
  }, [meData?.created_at]);

  // Format rating display
  const displayRating = useMemo(() => {
    const r = meData?.profile?.rating;
    if (r === undefined || r === null) return '5.0'; // Default to 5.0 for new accounts
    const parsed = typeof r === 'string' ? parseFloat(r) : r;
    return parsed.toFixed(1);
  }, [meData?.profile?.rating]);

  const displayTotalRides = meData?.profile?.total_rides ?? 0;

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

        {/* Error Fallback */}
        {isMeError && (
          <GlassCard className="text-center p-6 border border-red-100" strong>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-red-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-[var(--rx-text)]">Failed to load profile details</h3>
            <p className="text-xs text-[var(--rx-text-3)] mt-1 mb-4">Please check your internet connection and try again.</p>
            <Button size="sm" onClick={() => refetchMe()} className="mx-auto min-w-[120px]">
              Retry
            </Button>
          </GlassCard>
        )}

        {/* Profile Card */}
        {!isMeError && (
          <GlassCard className="text-center" strong>
            {isMeLoading ? (
              // Loading Skeleton
              <div className="animate-pulse space-y-6 py-4">
                <div className="mx-auto w-24 h-24 rounded-full bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-5 w-32 bg-gray-200 mx-auto rounded" />
                  <div className="h-3.5 w-24 bg-gray-200 mx-auto rounded" />
                </div>
                <div className="grid grid-cols-3 gap-3 pt-4">
                  <div className="h-16 bg-gray-200 rounded-xl" />
                  <div className="h-16 bg-gray-200 rounded-xl" />
                  <div className="h-16 bg-gray-200 rounded-xl" />
                </div>
                <div className="space-y-3 pt-4 border-t border-[var(--rx-border)]">
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                </div>
              </div>
            ) : (
              // Profile Content
              <>
                {/* Avatar circle */}
                <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-tr from-[#FF5A1F] to-orange-600 flex items-center justify-center text-white font-extrabold text-3xl shadow-[0_0_25px_rgba(255,90,31,0.25)] mb-4 select-none">
                  {displayName ? displayName[0].toUpperCase() : 'U'}
                </div>

                <h2 className="text-xl font-bold text-[var(--rx-text)] mb-0.5">{displayName}</h2>
                <div className="flex items-center justify-center space-x-1.5 mb-1">
                  <span className="text-xs font-bold uppercase bg-[#FF5A1F]/10 text-[#FF5A1F] px-2 py-0.5 rounded border border-[#FF5A1F]/20">
                    {displayRole}
                  </span>
                  <span className="text-[11px] text-[var(--rx-text-3)] font-semibold uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-0.5 rounded border border-gray-200">
                    ✓ Verified
                  </span>
                </div>

                {/* Member Since Row */}
                <div className="flex items-center justify-center space-x-1 text-[var(--rx-text-3)] text-xs mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <span>Member since {memberSince}</span>
                </div>

                {/* Profile Statistics Badges */}
                <div className="grid grid-cols-3 gap-2.5 mb-6 text-center">
                  <div className="bg-[var(--rx-glass)] border border-[var(--rx-glass-border)] rounded-xl py-3 px-2 flex flex-col justify-center items-center shadow-sm">
                    <span className="text-xs text-[var(--rx-text-3)] font-medium mb-1">Total Rides</span>
                    <span className="text-base font-bold text-[var(--rx-text)]">{displayTotalRides}</span>
                  </div>
                  <div className="bg-[var(--rx-glass)] border border-[var(--rx-glass-border)] rounded-xl py-3 px-2 flex flex-col justify-center items-center shadow-sm">
                    <span className="text-xs text-[var(--rx-text-3)] font-medium mb-1">Rider Rating</span>
                    <span className="text-base font-bold text-[#FF5A1F] flex items-center justify-center space-x-0.5">
                      <span>★</span>
                      <span>{displayRating}</span>
                    </span>
                  </div>
                  <div className="bg-[var(--rx-glass)] border border-[var(--rx-glass-border)] rounded-xl py-3 px-2 flex flex-col justify-center items-center shadow-sm">
                    <span className="text-xs text-[var(--rx-text-3)] font-medium mb-1">Total Spent</span>
                    <span className="text-base font-bold text-[var(--rx-text)]">
                      {isPaymentsLoading ? (
                        <span className="inline-block w-8 h-4 bg-gray-150 animate-pulse rounded" />
                      ) : (
                        `₹${Math.round(totalSpent)}`
                      )}
                    </span>
                  </div>
                </div>

                {/* Details list */}
                <div className="space-y-4 text-left border-t border-[var(--rx-border)] pt-5 mb-4">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs text-[var(--rx-text-3)] font-medium">Phone Number</span>
                    <span className="text-sm text-[var(--rx-text-1)] font-semibold">
                      {displayPhone}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs text-[var(--rx-text-3)] font-medium">Email Address</span>
                    <span className="text-sm text-[var(--rx-text-1)] font-semibold">
                      {displayEmail}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs text-[var(--rx-text-3)] font-medium">Account Status</span>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      Active
                    </span>
                  </div>
                </div>
              </>
            )}
          </GlassCard>
        )}

        {/* Quick Actions Menu */}
        {!isMeError && !isMeLoading && (
          <GlassCard className="py-2.5 px-4" strong>
            <div className="divide-y divide-[var(--rx-border)]">
              <button
                onClick={() => navigate('/history')}
                className="w-full flex items-center justify-between py-3 text-left group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.03 0 1.9.693 2.166 1.638m-7.377 12.408l1.5-1.5 3 3m-9-3h.01M2.25 12h.01M2.25 15h.01M2.25 18h.01" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-[var(--rx-text)]">My Rides & Invoices</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-[var(--rx-text-3)] group-hover:translate-x-0.5 transition-transform">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </GlassCard>
        )}

        {/* Logout button */}
        <Button variant="danger" className="w-full h-[50px] !rounded-xl" onClick={handleLogout}>
          Log Out Account
        </Button>
      </div>
    </div>
  );
}
