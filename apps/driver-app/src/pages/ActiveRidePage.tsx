import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDriverRideStore } from '../stores/driverRideStore';
import { api } from '../lib/axios';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DriverMap } from '../components/DriverMap';

interface LatLng { lat: number; lng: number; }

export default function ActiveRidePage() {
  const navigate = useNavigate();
  const { activeRide, updateStatus, sendLocation } = useDriverRideStore();
  const [localActiveRide, setLocalActiveRide] = useState<any>(null);

  // Real driver GPS — updated live by the browser
  const [driverPos, setDriverPos] = useState<LatLng | null>(null);

  // Timer for ARRIVED / IN_PROGRESS
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Restore ride from DB if store is empty (e.g. page refresh) ────────────
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
        .catch(() => navigate('/'));
    }
  }, [activeRide, navigate]);

  // Keep localActiveRide in sync when store updates status mid-ride
  useEffect(() => {
    if (activeRide) setLocalActiveRide(activeRide);
  }, [activeRide]);

  // ── Real GPS watch + broadcast ─────────────────────────────────────────────
  useEffect(() => {
    if (!localActiveRide) return;
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setDriverPos({ lat, lng });
        sendLocation(lat, lng, localActiveRide.id);
      },
      (err) => console.warn('GPS error:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 4000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [localActiveRide, sendLocation]);

  // ── Ride duration timer ────────────────────────────────────────────────────
  useEffect(() => {
    const status = localActiveRide?.status;
    if (status === 'ARRIVED' || status === 'IN_PROGRESS') {
      if (!timerRef.current) {
        setTimerSeconds(0);
        timerRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
      }
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [localActiveRide?.status]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleArrived       = useCallback(async () => { if (localActiveRide) await updateStatus(localActiveRide.id, 'ARRIVED');    }, [localActiveRide, updateStatus]);
  const handleStartRide     = useCallback(async () => { if (localActiveRide) await updateStatus(localActiveRide.id, 'IN_PROGRESS'); }, [localActiveRide, updateStatus]);
  const handleCompleteRide  = useCallback(async () => {
    if (!localActiveRide) return;
    await updateStatus(localActiveRide.id, 'COMPLETED');
    navigate(`/rate-rider/${localActiveRide.id}`);
  }, [localActiveRide, updateStatus, navigate]);

  const handleCancelRide = useCallback(async () => {
    if (!localActiveRide) return;
    if (!window.confirm('Cancel this ride?')) return;
    await api.post(`/rides/${localActiveRide.id}/cancel`, { reason: 'Driver cancelled' });
    useDriverRideStore.setState({ activeRide: null });
    navigate('/');
  }, [localActiveRide, navigate]);

  const formatTimer = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!localActiveRide) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#FF5A1F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const {
    status,
    rider_name, rider_phone, rider_rating,
    pickup_lat, pickup_lng, pickup_address,
    drop_lat,   drop_lng,   drop_address,
    estimated_fare,
  } = localActiveRide;

  const pickupLatLng: LatLng | null =
    pickup_lat && pickup_lng ? { lat: Number(pickup_lat), lng: Number(pickup_lng) } : null;

  const dropLatLng: LatLng | null =
    drop_lat && drop_lng ? { lat: Number(drop_lat), lng: Number(drop_lng) } : null;

  const routeMode: 'to_pickup' | 'to_drop' =
    status === 'IN_PROGRESS' ? 'to_drop' : 'to_pickup';

  // Label helpers
  const statusLabel = {
    ACCEPTED:    { badge: 'warning'  as const, badge_text: '🚗  HEADING TO PICKUP',    title: 'Pick Up Passenger'       },
    ARRIVED:     { badge: 'success'  as const, badge_text: '📍  ARRIVED AT PICKUP',     title: 'Waiting for Passenger'   },
    IN_PROGRESS: { badge: 'primary'  as const, badge_text: '▶  RIDE IN PROGRESS',       title: 'Heading to Destination'  },
  }[status] ?? { badge: 'warning' as const, badge_text: status, title: status };

  const destinationLabel = status === 'IN_PROGRESS' ? drop_address : pickup_address;

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── Full-Screen Map ─────────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <DriverMap
          driverLocation={driverPos}
          pickup={pickupLatLng}
          drop={dropLatLng}
          routeMode={routeMode}
        />
      </div>

      {/* ── Top HUD ─────────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 pointer-events-none">
        <div className="max-w-md mx-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl shadow-slate-200/80 border border-slate-200/60 px-5 py-4 flex items-center justify-between pointer-events-auto">
            <div>
              <Badge variant={statusLabel.badge}>{statusLabel.badge_text}</Badge>
              <h2 className="text-base font-black text-slate-800 mt-1.5">{statusLabel.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[220px]">→ {destinationLabel}</p>
            </div>

            {(status === 'ARRIVED' || status === 'IN_PROGRESS') && (
              <div className="text-right ml-4 flex-shrink-0">
                <span className="text-2xl font-black text-[#FF5A1F] font-mono tabular-nums">
                  {formatTimer(timerSeconds)}
                </span>
                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Duration</span>
              </div>
            )}

            {/* GPS dot */}
            {driverPos && (
              <div className="ml-3 flex-shrink-0">
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" title="GPS active" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Legend pill (route colour explanation) ──────────────────────────── */}
      <div className="absolute top-[100px] left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg ${
          routeMode === 'to_pickup' ? 'bg-emerald-500' : 'bg-[#FF5A1F]'
        }`}>
          <span>{routeMode === 'to_pickup' ? '🟢' : '🟠'}</span>
          <span>{routeMode === 'to_pickup' ? 'Route to Pickup' : 'Route to Destination'}</span>
        </div>
      </div>

      {/* ── Bottom Panel ────────────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-6 pointer-events-none">
        <div className="max-w-md mx-auto space-y-3 pointer-events-auto">

          {/* Rider info card */}
          <GlassCard className="bg-white/95 backdrop-blur-md border border-slate-200/60 shadow-2xl shadow-slate-200/80 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FF5A1F]/20 to-orange-100 border border-orange-200 flex items-center justify-center font-extrabold text-[#FF5A1F] text-lg shadow-sm flex-shrink-0">
                  {(rider_name || 'R')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 leading-tight">{rider_name || 'Rider'}</h3>
                  <span className="text-xs text-amber-500 font-semibold">★ {Number(rider_rating || 5).toFixed(1)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Fare</span>
                  <span className="text-lg font-black text-slate-800">₹{estimated_fare}</span>
                </div>
                {rider_phone && (
                  <a
                    href={`tel:${rider_phone}`}
                    className="p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-slate-600 hover:text-emerald-600 transition-colors shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.802-5.194-4.172-7-7l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                  </a>
                )}
              </div>
            </div>

            {/* Address pills */}
            <div className="mt-3 space-y-2">
              <div className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                </span>
                <span className="text-slate-600 leading-snug">{pickup_address}</span>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 w-4 h-4 rounded-sm bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-sm bg-white" />
                </span>
                <span className="text-slate-600 leading-snug">{drop_address}</span>
              </div>
            </div>
          </GlassCard>

          {/* Action buttons */}
          <div className="space-y-2">
            {status === 'ACCEPTED' && (
              <Button variant="primary" size="lg" fullWidth onClick={handleArrived}
                className="h-12 rounded-xl shadow-lg shadow-orange-400/30">
                📍  I Have Arrived
              </Button>
            )}
            {status === 'ARRIVED' && (
              <Button variant="primary" size="lg" fullWidth onClick={handleStartRide}
                className="h-12 rounded-xl shadow-lg shadow-orange-400/30">
                ▶  Start Ride
              </Button>
            )}
            {status === 'IN_PROGRESS' && (
              <Button variant="primary" size="lg" fullWidth onClick={handleCompleteRide}
                className="h-12 rounded-xl shadow-lg shadow-orange-400/30">
                ✅  Complete Ride
              </Button>
            )}
            {status !== 'IN_PROGRESS' && (
              <Button variant="ghost" size="md" fullWidth onClick={handleCancelRide}
                className="h-10 border border-slate-200 bg-white/80 backdrop-blur-sm text-slate-500 text-sm rounded-xl">
                Cancel Ride
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
