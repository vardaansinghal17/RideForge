import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useDriverRideStore } from '../stores/driverRideStore';
import { useAuthStore } from '../stores/authStore';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { incomingRide, activeRide, acceptRide, rejectRide, offerSecondsLeft, sendLocation } = useDriverRideStore();
  const [locInterval, setLocInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Fetch driver profile
  const { data: driverProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['driverProfile'],
    queryFn: async () => {
      const res = await api.get('/drivers/me');
      return res.data.data;
    },
  });

  // Fetch active ride on load to redirect if in progress
  const { data: activeRideCheck } = useQuery({
    queryKey: ['activeRideCheck'],
    queryFn: async () => {
      const res = await api.get('/drivers/active-ride');
      return res.data.data;
    },
    retry: false,
  });

  // Fetch today's earnings
  const { data: todayEarnings } = useQuery({
    queryKey: ['todayEarnings'],
    queryFn: async () => {
      const res = await api.get('/drivers/earnings?period=today');
      return res.data.data;
    },
  });

  // Toggle availability mutation
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

  // Check active ride redirect
  useEffect(() => {
    if (activeRideCheck) {
      useDriverRideStore.setState({ activeRide: activeRideCheck });
      navigate('/active-ride');
    }
  }, [activeRideCheck, navigate]);

  // Handle real-time store active ride transition
  useEffect(() => {
    if (activeRide) {
      navigate('/active-ride');
    }
  }, [activeRide, navigate]);

  // Background location simulator while online
  const isAvailable = driverProfile?.is_available || false;
  useEffect(() => {
    if (isAvailable) {
      sendLocation(12.9716, 77.5946);

      const interval = setInterval(() => {
        const offsetLat = (Math.random() - 0.5) * 0.002;
        const offsetLng = (Math.random() - 0.5) * 0.002;
        sendLocation(12.9716 + offsetLat, 77.5946 + offsetLng);
      }, 10000);

      setLocInterval(interval);
      return () => {
        clearInterval(interval);
      };
    } else {
      if (locInterval) {
        clearInterval(locInterval);
        setLocInterval(null);
      }
    }
  }, [isAvailable, sendLocation]);

  const handleToggleOnline = () => {
    if (!driverProfile) return;
    if (!driverProfile.is_approved) return;
    if (!driverProfile.make) {
      navigate('/vehicle-setup');
      return;
    }
    toggleAvailabilityMutation.mutate(!driverProfile.is_available);
  };

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-[var(--rx-blue)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasVehicle = !!driverProfile?.make;
  const isApproved = driverProfile?.is_approved || false;

  return (
    <div className="space-y-8 animate-fade-in text-left">
      
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-8 shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between space-y-6 md:space-y-0">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FF5A1F]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {driverProfile?.name || user?.name}!
          </h2>
          <p className="text-indigo-200 text-sm mt-1.5 font-medium">
            {isApproved 
              ? 'You are verified and ready to accept bookings. Drive safely!'
              : 'Your driver verification profile is currently pending approval.'}
          </p>
        </div>
        
        {isApproved && (
          <div className="relative z-10 flex items-center space-x-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/10">
            <span className={`w-3.5 h-3.5 rounded-full ${isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-200">Current Status</div>
              <div className="text-sm font-black tracking-wide">{isAvailable ? 'ONLINE & READY' : 'OFFLINE'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns (Col Span 2) - Duty Status & Action Panel */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Approval Alert if Pending */}
          {!isApproved && (
            <GlassCard className="p-6 border-l-4 border-amber-500">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-800">Verification in Progress</h4>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Our admin team is reviewing your profile, driver's license, and registration. You will receive access to start accepting ride requests on your dashboard as soon as you are verified.
                  </p>
                  
                  {/* Step Checker */}
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="border border-emerald-500/20 bg-emerald-50/50 rounded-xl p-3.5 flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">✓</div>
                      <span className="text-xs font-bold text-slate-700">Submit Application</span>
                    </div>
                    <div className={`border rounded-xl p-3.5 flex items-center space-x-3 ${hasVehicle ? 'border-emerald-500/20 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${hasVehicle ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                        {hasVehicle ? '✓' : '2'}
                      </div>
                      <span className="text-xs font-bold text-slate-700">Vehicle Configured</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Duty status tracker */}
          {isApproved && (
            <GlassCard className="p-8">
              {isAvailable ? (
                <div className="text-center py-6 space-y-6">
                  {/* Radar Pulse Animation */}
                  <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 bg-[#FF5A1F]/10 rounded-full animate-ping" />
                    <div className="absolute w-24 h-24 bg-[#FF5A1F]/20 rounded-full animate-pulse" />
                    <div className="w-16 h-16 bg-[#FF5A1F] rounded-full flex items-center justify-center text-white shadow-xl relative z-10">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 animate-spin">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Searching for Passenger Offers...</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                      Your location is being updated in real-time. Keep this page open to receive the next available ride.
                    </p>
                  </div>
                  <Button variant="danger" size="md" onClick={handleToggleOnline} className="px-10 h-[48px] mx-auto rounded-xl">
                    Go Offline
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 space-y-5">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">You are currently Offline</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                      Go online to start receiving ride booking offers in your current area.
                    </p>
                  </div>
                  <Button variant="primary" size="md" onClick={handleToggleOnline} className="px-10 h-[48px] mx-auto rounded-xl">
                    Go Online
                  </Button>
                </div>
              )}
            </GlassCard>
          )}
        </div>

        {/* Right Columns (Col Span 1) - Side Analytics & Vehicle Info */}
        <div className="space-y-8">
          
          {/* Today's Activity metrics */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Today's Summary</h3>
              <button 
                onClick={() => navigate('/earnings')}
                className="text-xs font-bold text-[#FF5A1F] hover:underline"
              >
                View Analytics
              </button>
            </div>
            
            <div className="space-y-5">
              <div className="flex items-center justify-between py-3.5 border-b border-slate-100">
                <span className="text-sm text-slate-500 font-medium">Earnings</span>
                <span className="text-base font-black text-slate-800">₹{todayEarnings?.periodEarnings || 0}</span>
              </div>
              <div className="flex items-center justify-between py-3.5 border-b border-slate-100">
                <span className="text-sm text-slate-500 font-medium">Rides Completed</span>
                <span className="text-base font-black text-slate-800">{todayEarnings?.periodRides || 0}</span>
              </div>
              <div className="flex items-center justify-between py-3.5">
                <span className="text-sm text-slate-500 font-medium">Distance Traveled</span>
                <span className="text-base font-black text-slate-800">{(todayEarnings?.periodDistance || 0).toFixed(1)} km</span>
              </div>
            </div>
          </GlassCard>

          {/* Vehicle Setup Card */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-5">Vehicle Setup</h3>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3.5">
                <div className="p-3 bg-slate-100 rounded-xl text-slate-700">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177V3.75c0-.621-.504-1.125-1.125-1.125h-1.5a1.125 1.125 0 00-1.125 1.125v3.582M14.25 7.5c-.621 0-1.125-.504-1.125-1.125V3.75M12 7.5V3.75m-6 3.75H4.25" />
                  </svg>
                </div>
                <div className="text-left min-w-0">
                  <h4 className="text-sm font-bold text-slate-800 truncate">
                    {hasVehicle ? `${driverProfile.make} ${driverProfile.model}` : 'No Vehicle Registered'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {hasVehicle ? `${driverProfile.plate_number} • ${driverProfile.color}` : 'Register a vehicle to start taking rides'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/vehicle-setup')}
                className="text-xs font-bold text-[#FF5A1F] hover:underline"
              >
                {hasVehicle ? 'Edit' : 'Setup'}
              </button>
            </div>
          </GlassCard>

        </div>

      </div>

      {/* Incoming Ride Offer Modal Overlay */}
      {incomingRide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <GlassCard className="w-full max-w-md p-6 text-center space-y-6 relative overflow-hidden shadow-2xl" strong>
            
            {/* Pulsing countdown circle */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="rgba(0,0,0,0.06)" strokeWidth="6" fill="transparent" />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#FF5A1F"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * offerSecondsLeft) / 15}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-800">{offerSecondsLeft}s</span>
                <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Expires</span>
              </div>
            </div>

            <div>
              <div className="inline-block px-3 py-1 bg-orange-500/10 border border-orange-500/20 text-[#FF5A1F] text-xs font-bold rounded-full select-none">
                ⚡ INCOMING RIDE REQUEST
              </div>
              <h3 className="text-2xl font-black text-slate-800 mt-3">₹{incomingRide.fare}</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Estimated Fare</p>
            </div>

            {/* Timelines */}
            <div className="space-y-4 text-left border-y border-slate-100 py-4">
              <div className="flex items-start space-x-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pickup Address</div>
                  <div className="text-sm font-semibold text-slate-800 mt-0.5 line-clamp-1">{incomingRide.pickup_address}</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Drop Address</div>
                  <div className="text-sm font-semibold text-slate-800 mt-0.5 line-clamp-1">{incomingRide.drop_address}</div>
                </div>
              </div>
            </div>

            {/* Distance & Rider stats */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-left">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Rider Details</span>
                <span className="text-sm font-bold text-slate-800 block mt-0.5">{incomingRide.rider?.name || 'Rider'}</span>
                <span className="text-xs text-amber-500 flex items-center font-bold mt-0.5">
                  ★ {incomingRide.rider?.rating || '5.0'}
                </span>
              </div>
              <div className="text-right border-l border-slate-200 pl-4">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Distance / Est.</span>
                <span className="text-sm font-bold text-slate-800 block mt-0.5">{incomingRide.distance_km} km</span>
                <span className="text-xs text-slate-500 block mt-0.5">~30 mins</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex space-x-3 pt-2">
              <Button variant="ghost" fullWidth onClick={() => rejectRide(incomingRide.id)} className="h-[48px] rounded-xl border border-slate-200 hover:bg-slate-50">
                Decline
              </Button>
              <Button variant="primary" fullWidth onClick={() => acceptRide(incomingRide.id)} className="h-[48px] rounded-xl">
                Accept Ride
              </Button>
            </div>

          </GlassCard>
        </div>
      )}

    </div>
  );
}
