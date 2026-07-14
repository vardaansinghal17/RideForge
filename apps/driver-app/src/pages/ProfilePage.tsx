import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function ProfilePage() {
  const navigate = useNavigate();

  const { data: driverProfile, isLoading } = useQuery({
    queryKey: ['driverProfile'],
    queryFn: async () => {
      const res = await api.get('/drivers/me');
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-[var(--rx-blue)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isApproved = driverProfile?.is_approved || false;
  const hasVehicle = !!driverProfile?.make;

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">My Profile</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your personal settings and registered vehicle configurations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - General Info (Col Span 1) */}
        <div className="space-y-6">
          {/* Profile Basic Info */}
          <GlassCard className="p-6 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-[#FF5A1F] flex items-center justify-center font-black text-[#FF5A1F] text-3xl mx-auto shadow-md select-none">
              {(driverProfile?.name || 'D')[0].toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">{driverProfile?.name}</h3>
              <p className="text-sm text-slate-500 font-medium mt-0.5">{driverProfile?.phone}</p>
            </div>
            <div className="flex items-center justify-center">
              <Badge variant={isApproved ? 'success' : 'warning'}>
                {isApproved ? 'Approved Driver' : 'Pending Verification'}
              </Badge>
            </div>
          </GlassCard>

          {/* Stats Summary Row */}
          <div className="grid grid-cols-2 gap-4">
            <GlassCard className="p-4 text-center">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Overall Rating</span>
              <span className="text-xl font-black text-slate-800 block mt-1.5">★ {driverProfile?.rating || '5.00'}</span>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Rides</span>
              <span className="text-xl font-black text-slate-800 block mt-1.5">{driverProfile?.total_rides || 0}</span>
            </GlassCard>
          </div>
        </div>

        {/* Right Column - Vehicle Details (Col Span 2) */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6 h-full flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h4 className="text-sm font-black text-slate-850 uppercase tracking-wider">
                  Vehicle Configuration
                </h4>
                <Button variant="ghost" size="sm" onClick={() => navigate('/vehicle-setup')} className="h-9 border border-slate-200 bg-white">
                  {hasVehicle ? 'Edit Details' : 'Configure'}
                </Button>
              </div>

              {hasVehicle ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Make & Model</span>
                    <span className="font-semibold text-slate-800 mt-1 block">{driverProfile.make} {driverProfile.model}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">License Plate</span>
                    <span className="font-semibold text-slate-800 mt-1 block">{driverProfile.plate_number}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Vehicle Type</span>
                    <span className="font-semibold text-slate-800 mt-1 block">{driverProfile.vehicle_type}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Color</span>
                    <span className="font-semibold text-slate-800 mt-1 block">{driverProfile.color}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <p className="text-sm text-slate-500 font-medium">
                    No vehicle has been registered to your profile. Please configure a vehicle to start driving.
                  </p>
                  <Button variant="primary" size="md" onClick={() => navigate('/vehicle-setup')} className="mx-auto rounded-xl">
                    Configure Vehicle
                  </Button>
                </div>
              )}
            </div>

            {hasVehicle && (
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-start space-x-3 text-left">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 11.513 1.293l-.041.02a.75.75 0 01-.513-1.293zm-2.25 2.25l.041-.02a.75.75 0 11.513 1.293l-.041.02a.75.75 0 01-.513-1.293zm0-4.5l.041-.02a.75.75 0 11.513 1.293l-.041.02a.75.75 0 01-.513-1.293zm2.25 2.25l.041-.02a.75.75 0 11.513 1.293l-.041.02a.75.75 0 01-.513-1.293zm2.25 2.25l.041-.02a.75.75 0 11.513 1.293l-.041.02a.75.75 0 01-.513-1.293zm0-4.5l.041-.02a.75.75 0 11.513 1.293l-.041.02a.75.75 0 01-.513-1.293zm2.25-2.25l.041-.02a.75.75 0 11.513 1.293l-.041.02a.75.75 0 01-.513-1.293zm0 2.25l.041-.02a.75.75 0 11.513 1.293l-.041.02a.75.75 0 01-.513-1.293zm-2.25-2.25l.041-.02a.75.75 0 11.513 1.293l-.041.02a.75.75 0 01-.513-1.293z" />
                </svg>
                <p className="text-xs text-slate-500 leading-normal">
                  To update other sensitive details such as driver's license or phone numbers, please contact our support team.
                </p>
              </div>
            )}
          </GlassCard>
        </div>

      </div>
    </div>
  );
}
