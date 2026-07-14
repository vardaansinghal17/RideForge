import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuthStore } from '../stores/authStore';
import { Badge } from './ui/Badge';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { logout, user } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch driver profile
  const { data: driverProfile } = useQuery({
    queryKey: ['driverProfile'],
    queryFn: async () => {
      const res = await api.get('/drivers/me');
      return res.data.data;
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      const res = await api.patch('/drivers/availability', { isAvailable });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['driverProfile'], (old: any) => {
        if (!old) return old;
        return { ...old, is_available: data.is_available };
      });
    },
  });

  const handleToggleOnline = () => {
    if (!driverProfile) return;
    if (!driverProfile.is_approved) return;
    if (!driverProfile.make) {
      navigate('/vehicle-setup');
      return;
    }
    toggleAvailabilityMutation.mutate(!driverProfile.is_available);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const isApproved = driverProfile?.is_approved || false;
  const isAvailable = driverProfile?.is_available || false;

  const menuItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      )
    },
    {
      path: '/earnings',
      label: 'Earnings',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5M3.75 20.25zM3.75 20.25H20.25M3.75 20.25A2.25 2.25 0 011.5 18V6.25A2.25 2.25 0 013.75 4h16.5A2.25 2.25 0 0122.5 6.25v11.75a2.25 2.25 0 01-2.25 2.25H3.75z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4.5m0 0a1.5 1.5 0 001.5 1.5M12 13.5a1.5 1.5 0 01-1.5-1.5M12 9a1.5 1.5 0 011.5-1.5M12 9a1.5 1.5 0 00-1.5 1.5" />
        </svg>
      )
    },
    {
      path: '/history',
      label: 'Ride History',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      path: '/ratings',
      label: 'Reviews & Ratings',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.172-.436.782-.436.954 0l2.22 4.817a.59.59 0 00.45.326l5.244.706c.476.064.667.65.31.986l-3.89 3.69a.59.59 0 00-.173.533l1.01 5.088c.09.458-.415.828-.821.57l-4.636-2.584a.59.59 0 00-.543 0l-4.636 2.584c-.406.257-.911-.113-.822-.57l1.01-5.088a.59.59 0 00-.173-.533l-3.89-3.69c-.356-.336-.165-.922.31-.986l5.244-.706a.59.59 0 00.45-.326l2.22-4.817z" />
        </svg>
      )
    },
    {
      path: '/profile',
      label: 'My Profile',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      )
    },
    {
      path: '/vehicle-setup',
      label: 'Vehicle Settings',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177V3.75c0-.621-.504-1.125-1.125-1.125h-1.5a1.125 1.125 0 00-1.125 1.125v3.582M14.25 7.5c-.621 0-1.125-.504-1.125-1.125V3.75M12 7.5V3.75m-6 3.75H4.25" />
        </svg>
      )
    }
  ];

  // Helper to resolve title
  const getPageTitle = () => {
    const matched = menuItems.find((item) => item.path === location.pathname);
    if (matched) return matched.label;
    if (location.pathname.startsWith('/rate-rider')) return 'Rate Passenger';
    if (location.pathname.startsWith('/active-ride')) return 'Active Booking';
    return 'Driver Dashboard';
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-[var(--rx-border)] shadow-sm">
      {/* Brand Header */}
      <div className="h-20 flex items-center px-8 border-b border-[var(--rx-border)]">
        <Link to="/" className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF5A1F] flex items-center justify-center text-white font-black text-xl shadow-lg">
            RF
          </div>
          <span className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#FF5A1F] to-[#EA580C]">
            RIDEFORGE
          </span>
        </Link>
      </div>

      {/* Driver Card */}
      <div className="p-6 border-b border-[var(--rx-border)] bg-slate-50/50">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-[#FF5A1F] flex items-center justify-center font-black text-[#FF5A1F] text-xl shadow-sm select-none">
            {(driverProfile?.name || user?.name || 'D')[0].toUpperCase()}
          </div>
          <div className="text-left flex-1 min-w-0">
            <h4 className="text-sm font-extrabold text-slate-800 truncate">
              {driverProfile?.name || user?.name}
            </h4>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
              <span className="flex items-center text-amber-500 font-semibold">
                ★ {driverProfile?.rating || '5.00'}
              </span>
              <span>•</span>
              <span>{driverProfile?.total_rides || 0} rides</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Badge variant={isApproved ? 'success' : 'warning'} className="w-full justify-center py-1">
            {isApproved ? 'Approved Driver' : 'Pending Verification'}
          </Badge>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3.5 px-4 h-12 rounded-xl transition-all duration-200 font-semibold text-sm ${
                active
                  ? 'bg-orange-500/10 text-[#FF5A1F]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={active ? 'text-[#FF5A1F]' : 'text-slate-400'}>
                {item.icon(active)}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div className="p-4 border-t border-[var(--rx-border)] bg-slate-50/50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 px-4 h-11 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-sm rounded-xl transition-all shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--rx-bg)] text-slate-800 font-sans">
      {/* Background Visual Glows */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-[#FF5A1F]/3 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/3 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-72 flex-shrink-0 z-10">
        <SidebarContent />
      </div>

      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white transition-transform duration-300 transform translate-x-0">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Right Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden z-10 relative">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-[var(--rx-border)] px-6 md:px-10 flex items-center justify-between flex-shrink-0 shadow-sm z-20">
          <div className="flex items-center space-x-4">
            {/* Hamburger for mobile */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-50 border border-slate-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
              {getPageTitle()}
            </h1>
          </div>

          {/* Quick Stats & Availability Toggle */}
          <div className="flex items-center space-x-4">
            {isApproved ? (
              <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="text-xs font-bold text-slate-700 tracking-wide">
                  {isAvailable ? 'ONLINE' : 'OFFLINE'}
                </span>
                <button
                  onClick={handleToggleOnline}
                  disabled={toggleAvailabilityMutation.isPending}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isAvailable ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isAvailable ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center space-x-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-1.5 text-xs font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Verification Pending Approval</span>
              </div>
            )}

            {/* Quick Profile Initials (Desktop) */}
            <div className="hidden md:flex w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[#FF5A1F] font-bold items-center justify-center select-none shadow-sm">
              {(driverProfile?.name || user?.name || 'D')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto w-full no-scrollbar relative">
          <div className="max-w-6xl mx-auto px-6 py-8 md:px-10 md:py-8 w-full z-10 relative">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
