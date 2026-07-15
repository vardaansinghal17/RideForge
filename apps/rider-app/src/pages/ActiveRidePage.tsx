import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRideStore } from '../stores/rideStore';
import { MapView } from '../components/Map/MapView';

export default function ActiveRidePage() {
  const navigate = useNavigate();
  const { ride, driverInfo, driverLocation, cancelRide, reset } = useRideStore();
  const status = ride?.status || null;

  const [etaSeconds, setEtaSeconds] = useState(240); // 4-minute ETA default
  const [initialSeconds] = useState(240);

  // Guard: if ride is null on mount -> navigate('/')
  useEffect(() => {
    if (!ride) {
      const timer = setTimeout(() => {
        if (!useRideStore.getState().ride) {
          navigate('/');
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    // Status checking
    if (status === 'COMPLETED') {
      navigate('/ride-complete', { replace: true });
    } else if (status === 'CANCELLED') {
      reset();
      navigate('/');
    }
  }, [ride, status, navigate, reset]);

  // ETA countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setEtaSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Set ETA to 0 if driver has arrived
  useEffect(() => {
    if (status === 'ARRIVED') {
      setEtaSeconds(0);
    }
  }, [status]);

  if (!ride) return null;

  const pickup = {
    lat: Number(ride.pickup_lat),
    lng: Number(ride.pickup_lng),
    address: ride.pickup_address,
  };
  const drop = {
    lat: Number(ride.drop_lat),
    lng: Number(ride.drop_lng),
    address: ride.drop_address,
  };

  const driverLoc =
    driverLocation?.lat && driverLocation?.lng
      ? { lat: Number(driverLocation.lat), lng: Number(driverLocation.lng) }
      : undefined;

  // Active step index logic
  const getActiveIndex = () => {
    switch (status) {
      case 'ACCEPTED':
        return 1;
      case 'ARRIVED':
        return 2;
      case 'IN_PROGRESS':
        return 3;
      case 'COMPLETED':
        return 4;
      default:
        return 0;
    }
  };

  const activeIndex = getActiveIndex();
  const showCancelButton = status === 'ACCEPTED' || status === 'ARRIVED';

  return (
    <div className="w-full h-screen bg-slate-50 overflow-hidden relative">
      {/* MAP LAYER */}
      <div className="fixed inset-0 z-0">
        <MapView pickup={pickup} drop={drop} driverLocation={driverLoc} />
      </div>

      {/* FLOATING TOP PANEL - STATUS & STEPPER */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl z-20">
        <div className="glass-card-strong p-4 md:p-5 flex flex-col gap-4 shadow-xl border border-white/20">
          
          {/* STATUS HEADER */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs tracking-wider uppercase text-slate-700">Ride Status</span>
            </div>
            
            <AnimatePresence mode="wait">
              {status && (
                <motion.div
                  key={status}
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 4 }}
                  transition={{ duration: 0.2 }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm ${
                    status === 'ACCEPTED'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200/50'
                      : status === 'ARRIVED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                      : status === 'IN_PROGRESS'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/50'
                      : 'bg-slate-50 text-slate-600 border border-slate-200/50'
                  }`}
                >
                  {status === 'ACCEPTED' && (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-450 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      <span>🚗 Driver is on the way</span>
                    </>
                  )}
                  {status === 'ARRIVED' && (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>✅ Driver has arrived</span>
                    </>
                  )}
                  {status === 'IN_PROGRESS' && (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </span>
                      <span>🛣️ You are on your way</span>
                    </>
                  )}
                  {status === 'REQUESTED' && (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                      </span>
                      <span>🔍 Looking for driver</span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* PROGRESS STEPPER */}
          <div className="flex items-center w-full px-2 mt-1">
            {['Confirmed', 'On the way', 'Arrived', 'In ride'].map((stepLabel, i) => {
              const isCompleted = i < activeIndex;
              const isCurrent = i === activeIndex;
              const isPending = i > activeIndex;

              return (
                <React.Fragment key={stepLabel}>
                  {/* LEFT CONNECTOR */}
                  {i > 0 && (
                    <div
                      className={`flex-1 h-[3px] rounded-full transition-all duration-500 ${
                        i <= activeIndex ? 'bg-orange-600' : 'bg-slate-200'
                      }`}
                    />
                  )}

                  {/* STEP NODE */}
                  <div className="flex flex-col items-center relative z-10 mx-1">
                    {/* Circle Dot */}
                    {isCurrent ? (
                      <motion.div
                        className="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center shadow-md shadow-orange-600/30"
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                      >
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </motion.div>
                    ) : (
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-500 ${
                          isCompleted
                            ? 'bg-orange-600 shadow-sm shadow-orange-600/20'
                            : 'bg-white border-2 border-slate-300'
                        }`}
                      >
                        {isCompleted && (
                          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}

                    {/* Label */}
                    <span
                      className={`text-[10px] md:text-xs font-semibold mt-1.5 transition-all duration-300 ${
                        i <= activeIndex ? 'text-slate-800' : 'text-slate-400 font-normal'
                      }`}
                    >
                      {stepLabel}
                    </span>
                  </div>

                  {/* RIGHT CONNECTOR */}
                  {i < 3 && (
                    <div
                      className={`flex-1 h-[3px] rounded-full transition-all duration-500 ${
                        i < activeIndex ? 'bg-orange-600' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

        </div>
      </div>

      {/* FLOATING BOTTOM PANEL - DRIVER INFO & ACTIONS */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-20">
        <div className="glass-card-strong p-4 md:p-5 flex flex-col gap-4 shadow-xl border border-white/20">
          
          {/* DRIVER INFO ROW */}
          <div className="flex items-center gap-4">
            
            {/* AVATAR */}
            <div className="w-14 h-14 relative rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-orange-600/20 flex-shrink-0">
              {(driverInfo?.driver_name?.[0] || 'D').toUpperCase()}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm animate-pulse" />
            </div>

            {/* DETAILS */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-800 tracking-tight truncate">
                {driverInfo?.driver_name || 'Rahul Kumar'}
              </h3>
              
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-0.5 text-amber-500">
                  <span className="text-xs">★</span>
                  <span className="text-xs font-semibold text-slate-700">
                    {driverInfo?.driver_rating || '5.0'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">•</span>
                <span className="text-xs text-slate-500">312 trips</span>
              </div>

              <div className="text-xs text-slate-500 mt-1 truncate">
                {driverInfo?.make || 'Maruti Suzuki'} {driverInfo?.model || 'Dzire'} • {driverInfo?.color || 'White'}
              </div>

              {/* LICENSE PLATE */}
              <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200/60 rounded-md px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase tracking-wider w-fit mt-1.5 shadow-sm">
                <span className="w-1.5 h-3.5 bg-blue-600 rounded-sm" />
                {driverInfo?.plate_number || 'DL 1CA 1234'}
              </div>
            </div>

            {/* ETA PROGRESS RING */}
            <div className="w-16 h-16 flex-shrink-0 relative flex items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-100">
              <svg className="w-14 h-14" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="#F1F5F9" strokeWidth="4.5" />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  stroke={etaSeconds === 0 ? '#10B981' : '#EA580C'}
                  strokeDasharray="163.4"
                  strokeDashoffset={
                    etaSeconds === 0 ? 0 : 163.4 * (1 - (initialSeconds - etaSeconds) / initialSeconds)
                  }
                  transform="rotate(-90 32 32)"
                  style={{
                    transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease',
                  }}
                />

                {etaSeconds > 0 ? (
                  <>
                    <text
                      x="32"
                      y="28"
                      textAnchor="middle"
                      fontSize="13"
                      fontWeight="800"
                      fill="#1E293B"
                      dominantBaseline="middle"
                    >
                      {Math.ceil(etaSeconds / 60)}
                    </text>
                    <text
                      x="32"
                      y="42"
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="600"
                      fill="#94A3B8"
                      dominantBaseline="middle"
                    >
                      MIN
                    </text>
                  </>
                ) : (
                  <path
                    d="M22 32 L29 39 L42 24"
                    stroke="#10B981"
                    strokeWidth="4.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </div>

          </div>

          {/* DIVIDER */}
          <div className="h-px bg-slate-200/60 w-full" />

          {/* ACTIONS */}
          <div className="flex gap-3">
            {showCancelButton && (
              <button
                onClick={() => {
                  cancelRide();
                  reset();
                  navigate('/');
                }}
                className="flex-1 h-11 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-xl text-xs transition-all duration-200 active:scale-[0.98] border border-rose-200/40"
              >
                Cancel Ride
              </button>
            )}

            <button
              onClick={() => {
                if (driverInfo?.driver_phone) {
                  window.open('tel:' + driverInfo.driver_phone);
                }
              }}
              className={`h-11 flex items-center justify-center gap-2 rounded-xl transition-all duration-200 active:scale-[0.98] shadow-sm ${
                showCancelButton
                  ? 'w-11 bg-slate-900 hover:bg-slate-800 text-white'
                  : 'flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold'
              }`}
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                stroke="currentColor"
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67 A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 a2 2 0 01-.45 2.11L8.09 9.91 a16 16 0 006 6l1.27-1.27 a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 A2 2 0 0122 16.92z" />
              </svg>
              {!showCancelButton && <span>Call Driver</span>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

