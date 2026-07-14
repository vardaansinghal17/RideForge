import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDriverRideStore } from '../stores/driverRideStore';
import { api } from '../lib/axios';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export default function ActiveRidePage() {
  const navigate = useNavigate();
  const { activeRide, updateStatus, sendLocation } = useDriverRideStore();
  const [localActiveRide, setLocalActiveRide] = useState<any>(null);
  
  // Timer for Arrived/In Progress states
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Background location updates
  useEffect(() => {
    if (!localActiveRide) return;

    // Send initial location
    sendLocation(12.9716, 77.5946, localActiveRide.id);

    const interval = setInterval(() => {
      const offsetLat = (Math.random() - 0.5) * 0.001;
      const offsetLng = (Math.random() - 0.5) * 0.001;
      sendLocation(12.9716 + offsetLat, 77.5946 + offsetLng, localActiveRide.id);
    }, 8000);

    return () => clearInterval(interval);
  }, [localActiveRide, sendLocation]);

  // Sync with store & database check
  useEffect(() => {
    if (activeRide) {
      setLocalActiveRide(activeRide);
    } else {
      api.get('/drivers/active-ride')
        .then((res) => {
          if (res.data.data) {
            useDriverRideStore.setState({ activeRide: res.data.data });
            setLocalActiveRide(res.data.data);
          } else {
            navigate('/');
          }
        })
        .catch(() => {
          navigate('/');
        });
    }
  }, [activeRide, navigate]);

  // Start timer when ARRIVED or IN_PROGRESS starts
  useEffect(() => {
    if (localActiveRide?.status === 'ARRIVED' || localActiveRide?.status === 'IN_PROGRESS') {
      if (!timerRef.current) {
        setTimerSeconds(0);
        timerRef.current = setInterval(() => {
          setTimerSeconds((prev) => prev + 1);
        }, 1000);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [localActiveRide?.status]);

  const handleArrived = async () => {
    if (!localActiveRide) return;
    try {
      await updateStatus(localActiveRide.id, 'ARRIVED');
    } catch (err) {
      console.error('Failed to set ARRIVED status', err);
    }
  };

  const handleStartRide = async () => {
    if (!localActiveRide) return;
    try {
      await updateStatus(localActiveRide.id, 'IN_PROGRESS');
    } catch (err) {
      console.error('Failed to start ride', err);
    }
  };

  const handleCompleteRide = async () => {
    if (!localActiveRide) return;
    try {
      await updateStatus(localActiveRide.id, 'COMPLETED');
      // Redirect to rating flow
      navigate(`/rate-rider/${localActiveRide.id}`);
    } catch (err) {
      console.error('Failed to complete ride', err);
    }
  };

  const handleCancelRide = async () => {
    if (!localActiveRide) return;
    if (!window.confirm('Are you sure you want to cancel this ride?')) return;
    try {
      await api.post(`/rides/${localActiveRide.id}/cancel`, { reason: 'Driver cancelled' });
      useDriverRideStore.setState({ activeRide: null });
      navigate('/');
    } catch (err) {
      console.error('Failed to cancel ride', err);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!localActiveRide) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-[#FF5A1F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { status, rider_name, rider_phone, rider_rating, pickup_address, drop_address, final_fare, fare } = localActiveRide;

  return (
    <div className="min-h-screen relative overflow-hidden pb-12 flex flex-col justify-between bg-slate-50">
      {/* Background Visual Glows */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-[#FF5A1F]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header HUD */}
      <div className="max-w-md mx-auto w-full px-4 pt-6 flex-shrink-0 relative z-10">
        <GlassCard className="p-4 flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-100">
          <div>
            {status === 'ACCEPTED' && <Badge variant="warning">HEADING TO PICKUP</Badge>}
            {status === 'ARRIVED' && <Badge variant="success">ARRIVED AT PICKUP</Badge>}
            {status === 'IN_PROGRESS' && <Badge variant="primary">RIDE IN PROGRESS</Badge>}
            <h2 className="text-lg font-black text-slate-800 mt-1">
              {status === 'ACCEPTED' && 'Pickup Passenger'}
              {status === 'ARRIVED' && 'Waiting for Passenger'}
              {status === 'IN_PROGRESS' && 'Heading to Destination'}
            </h2>
          </div>
          {(status === 'ARRIVED' || status === 'IN_PROGRESS') && (
            <div className="text-right">
              <span className="text-2xl font-black text-[#FF5A1F] font-mono">{formatTimer(timerSeconds)}</span>
              <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Ride Duration</span>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Simulated Route Display Map */}
      <div className="flex-grow flex items-center justify-center p-4 min-h-[220px] relative z-10">
        <div className="relative w-full max-w-sm h-48 bg-slate-100/60 border border-slate-200/60 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
          {/* subtle gridlines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
          
          <svg className="w-4/5 h-4/5" viewBox="0 0 200 100">
            {/* Route Line Underlay */}
            <path
              d="M 20 80 Q 70 20, 100 50 T 180 20"
              fill="none"
              stroke="rgba(255,90,31,0.08)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Pulsing Route Path */}
            <path
              d="M 20 80 Q 70 20, 100 50 T 180 20"
              fill="none"
              stroke="#FF5A1F"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="8 6"
              className="animate-[dash_10s_linear_infinite]"
              style={{
                strokeDashoffset: 100,
              }}
            />

            {/* Pickup Node */}
            <circle cx="20" cy="80" r="7" fill="#10B981" />
            <circle cx="20" cy="80" r="12" fill="none" stroke="#10B981" strokeWidth="2" className="animate-ping" />

            {/* Drop Node */}
            <circle cx="180" cy="20" r="7" fill="#3B82F6" />

            {/* Simulated Driver Node (moves along path) */}
            <circle cx="100" cy="50" r="5" fill="#FFFFFF" stroke="#FF5A1F" strokeWidth="3" />
          </svg>

          {/* Floating Address Preview Overlay */}
          <div className="absolute bottom-3 left-3 right-3 bg-white/95 border border-slate-200/80 backdrop-blur-md rounded-xl p-2.5 flex items-center justify-between text-xs shadow-md">
            <span className="text-slate-700 font-semibold truncate max-w-[200px]">
              {status === 'ACCEPTED' ? pickup_address : drop_address}
            </span>
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ml-2">
              {status === 'ACCEPTED' ? 'PICKUP' : 'DROP'}
            </span>
          </div>
        </div>
      </div>

      {/* Rider Details & Action Panel */}
      <div className="max-w-md mx-auto w-full px-4 flex-shrink-0 space-y-4 relative z-10">
        
        {/* Rider Details Card */}
        <GlassCard className="p-4 space-y-4 bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center font-extrabold text-[#FF5A1F] text-lg shadow-sm">
                {(rider_name || 'R')[0].toUpperCase()}
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-slate-800">{rider_name || 'Rider'}</h3>
                <span className="text-xs text-amber-500 font-semibold flex items-center mt-0.5">
                  ★ {rider_rating || '5.0'}
                </span>
              </div>
            </div>
            {rider_phone && (
              <a
                href={`tel:${rider_phone}`}
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.802-5.194-4.172-7-7l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-left">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Ride Fare</span>
              <span className="text-lg font-black text-slate-800 mt-0.5">₹{final_fare || fare}</span>
            </div>
            <div className="border-l border-slate-100 pl-4">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Payment Method</span>
              <span className="text-sm font-bold text-slate-700 mt-0.5">Online Wallet</span>
            </div>
          </div>
        </GlassCard>

        {/* Action Button Panel */}
        <div className="space-y-3">
          {status === 'ACCEPTED' && (
            <Button variant="primary" size="lg" fullWidth onClick={handleArrived} className="h-12 rounded-xl">
              I Have Arrived
            </Button>
          )}

          {status === 'ARRIVED' && (
            <Button variant="primary" size="lg" fullWidth onClick={handleStartRide} className="h-12 rounded-xl">
              Start Ride
            </Button>
          )}

          {status === 'IN_PROGRESS' && (
            <Button variant="primary" size="lg" fullWidth onClick={handleCompleteRide} className="h-12 rounded-xl">
              Complete Ride
            </Button>
          )}

          {status !== 'IN_PROGRESS' && (
            <Button variant="ghost" size="md" fullWidth onClick={handleCancelRide} className="h-11 border border-slate-200 bg-white">
              Cancel Ride
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
