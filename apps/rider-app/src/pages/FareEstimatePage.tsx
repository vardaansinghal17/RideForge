import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../lib/axios';
import { useRideStore } from '../stores/rideStore';
import { MapView } from '../components/Map/MapView';
import { GlassCard } from '../components/ui/GlassCard';

interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

interface LocationState {
  pickup: LocationData;
  drop: LocationData;
  distanceKm: number;
  durationMin: number;
}

const RIDE_TYPES = [
  { name: 'RideX Go', emoji: '🚗', desc: 'Affordable, everyday', seats: 4, etaMin: 2, fareMultiplier: 1.0 },
  { name: 'RideX Prime', emoji: '🚙', desc: 'Comfortable, spacious', seats: 6, etaMin: 4, fareMultiplier: 1.5 },
  { name: 'RideX Auto', emoji: '🛺', desc: 'Quick, budget-friendly', seats: 3, etaMin: 1, fareMultiplier: 0.65 },
];

const MOCK_STATE: LocationState = {
  pickup: { lat: 28.6139, lng: 77.2090, address: 'Connaught Place, New Delhi' },
  drop: { lat: 28.6304, lng: 77.2177, address: 'India Gate, New Delhi' },
  distanceKm: 2.02,
  durationMin: 5,
};

export default function FareEstimatePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { requestRide } = useRideStore();
  const [selectedRideIndex, setSelectedRideIndex] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Fallback to MOCK_STATE for testing and direct navigation
  const state = (location.state as LocationState | null) || MOCK_STATE;

  // Redirect to /ride if no state is present (unless using mock fallback for dev testing)
  useEffect(() => {
    if (!state || !state.pickup || !state.drop || !state.distanceKm || !state.durationMin) {
      navigate('/ride');
    }
  }, [state, navigate]);

  const estimateMutation = useMutation({
    mutationFn: async () => {
      if (!state) return null;
      try {
        const res = await api.post('/rides/estimate-fare', {
          distanceKm: state.distanceKm,
          durationMin: state.durationMin,
        });
        return res.data.data;
      } catch (err) {
        console.error('Failed to fetch estimate, using fallback values', err);
        return { fare: 62, surgeMultiplier: 1.0 };
      }
    },
  });

  useEffect(() => {
    if (state) {
      estimateMutation.mutate();
    }
  }, [state]);

  if (!state) return null;

  const { pickup, drop, distanceKm, durationMin } = state;
  const isLoading = estimateMutation.isPending;
  const isError = estimateMutation.isError;
  const apiData = estimateMutation.data;

  const selectedRide = RIDE_TYPES[selectedRideIndex];
  const baseFare = apiData?.fare || 62;
  const surgeMultiplier = apiData?.surgeMultiplier || 1.0;
  const calculatedFare = Math.round(baseFare * selectedRide.fareMultiplier);

  const breakdown = apiData?.breakdown || {
    baseFare: Math.round(baseFare * 0.4),
    distanceFare: Math.round(baseFare * 0.4),
    timeFare: Math.round(baseFare * 0.2),
    surgeFare: 0,
    total: baseFare,
  };

  const handleBookRide = () => {
    requestRide({
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      pickupAddress: pickup.address,
      dropLat: drop.lat,
      dropLng: drop.lng,
      dropAddress: drop.address,
      distanceKm: distanceKm,
      durationMin: durationMin,
    });
    navigate('/searching');
  };

  return (
    <motion.div
      className="relative w-full h-screen bg-[#F8F9FA] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Full-screen Map Backdrop */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapView pickup={pickup} drop={drop} />
      </div>

      {/* Floating Back Header Pill */}
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={() => navigate('/ride')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.12)] border border-gray-150/80 hover:bg-gray-50 transition-colors text-[var(--rx-text)] font-bold text-xs cursor-pointer select-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-3.5 h-3.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span>Choose your ride</span>
        </button>
      </div>

      {/* Scrollable Container Over Map */}
      <div className="absolute inset-0 z-10 overflow-y-auto no-scrollbar pb-[220px] pointer-events-none">
        
        {/* Spacer to keep map content interactive & visible at the top */}
        <div className="h-[240px] sm:h-[280px] w-full pointer-events-none" />

        {/* Content Cards overlaying the Map */}
        <div className="pointer-events-auto px-4 py-4 max-w-md mx-auto w-full flex flex-col gap-4 bg-transparent">
          
          {/* Route Summary Card */}
          <div className="bg-white/95 backdrop-blur-md border border-gray-150/50 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] p-4 flex items-center justify-between w-full">
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              {/* Pickup */}
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--rx-green)] shrink-0" />
                <span className="text-xs font-semibold text-[var(--rx-text)] truncate">{pickup.address}</span>
              </div>

              <div className="h-[1px] bg-gray-150/50 ml-5" />

              {/* Drop */}
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-sm bg-black shrink-0" />
                <span className="text-xs font-semibold text-[var(--rx-text)] truncate">{drop.address}</span>
              </div>
            </div>

            {/* Distance Badge */}
            <span className="ml-3 shrink-0 bg-gray-150/30 text-[var(--rx-text-2)] text-[10px] font-bold px-2.5 py-1 rounded-md border border-gray-250/20">
              {distanceKm} km
            </span>
          </div>

          {/* Available Rides Section */}
          <div className="w-full">
            <h3 className="text-left text-[11px] font-extrabold uppercase tracking-wider text-[var(--rx-text-3)] mb-3 bg-white/40 px-2 py-0.5 rounded-full w-max backdrop-blur-sm">
              Available Rides
            </h3>

            {isLoading ? (
              <div className="flex flex-col gap-2.5">
                {[1, 2, 3].map((val) => (
                  <div
                    key={val}
                    className="h-[76px] w-full rounded-xl bg-white/70 border border-white/50 animate-pulse shadow-sm"
                  />
                ))}
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center p-6 border border-gray-150/50 rounded-xl gap-3 bg-white/95 backdrop-blur-md shadow-md">
                <p className="text-xs text-[var(--rx-text-2)]">Failed to fetch fare estimate.</p>
                <button
                  onClick={() => estimateMutation.mutate()}
                  className="px-3.5 py-1.5 bg-[var(--rx-blue)] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-black transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {RIDE_TYPES.map((type, idx) => {
                  const active = selectedRideIndex === idx;
                  const fare = Math.round(baseFare * type.fareMultiplier);
                  return (
                    <motion.div
                      key={type.name}
                      onClick={() => setSelectedRideIndex(idx)}
                      className="rounded-xl p-3.5 cursor-pointer flex items-center gap-3.5 border transition-all"
                      style={{
                        border: active ? '1.5px solid #FF5A1F' : '1px solid rgba(15, 23, 42, 0.08)',
                        backgroundColor: active ? 'rgba(255, 90, 31, 0.08)' : 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(8px)',
                        boxShadow: active ? '0 4px 15px rgba(255, 90, 31, 0.12)' : '0 4px 12px rgba(0,0,0,0.04)',
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Left: emoji */}
                      <div className="w-11 h-11 rounded-lg bg-gray-50 flex items-center justify-center text-xl shrink-0">
                        {type.emoji}
                      </div>

                      {/* Middle */}
                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="text-sm font-bold text-[var(--rx-text)] leading-tight">
                          {type.name}
                        </h4>
                        <div className="flex items-center text-[11px] text-[var(--rx-text-2)] mt-0.5 whitespace-nowrap truncate">
                          <span>{type.desc}</span>
                          <span className="mx-1">•</span>
                          <span className="text-[#FF5A1F] font-semibold">{type.etaMin} min away</span>
                        </div>
                      </div>

                      {/* Right */}
                      <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                        <span className="text-base font-extrabold text-[var(--rx-text)]">₹{fare}</span>
                        {surgeMultiplier > 1 && (
                          <span className="bg-[#FEF3C7] text-[#D97706] text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            {surgeMultiplier}x surge
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fare Breakdown Section */}
          {!isLoading && !isError && apiData && (
            <div className="bg-white/95 backdrop-blur-md border border-gray-150/50 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] p-4 w-full">
              <div
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="flex justify-between items-center cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--rx-text)]">Fare Breakdown</span>
                  <span className="text-[10px] bg-gray-50 text-[var(--rx-text-2)] px-2 py-0.5 rounded-full font-semibold">
                    Click to {showBreakdown ? 'hide' : 'view'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-extrabold text-[var(--rx-text)]">₹{calculatedFare}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className={`w-3.5 h-3.5 text-[var(--rx-text-2)] transition-transform duration-200 ${
                      showBreakdown ? 'rotate-180' : ''
                    }`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>

              {showBreakdown && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-gray-100">
                    {[
                      { label: 'Base Fare', val: breakdown.baseFare, color: 'bg-slate-500/10' },
                      { label: 'Distance Fare', val: breakdown.distanceFare, color: 'bg-emerald-500/10' },
                      { label: 'Time Fare', val: breakdown.timeFare, color: 'bg-amber-500/10' },
                      { label: 'Surge Price', val: breakdown.surgeFare, color: 'bg-rose-500/10' },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-xs py-1">
                        <span className="text-[var(--rx-text-2)] font-medium">{row.label}</span>
                        <span className={`font-semibold text-[var(--rx-text)] px-2 py-0.5 rounded-md ${row.color}`}>
                          ₹{Math.round(row.val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {surgeMultiplier > 1 && (
                <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 flex items-center gap-2">
                  <span className="text-[11px] text-amber-800 font-semibold flex items-center gap-1">
                    ⚡ <span>{surgeMultiplier}x surge pricing active due to high demand</span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Actions Area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-20 bg-white/95 backdrop-blur-md border-t border-gray-150/50 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.08)] max-w-md mx-auto flex flex-col gap-3">
        {/* Payment Method */}
        <div className="bg-gray-50/90 rounded-xl p-[10px_14px] flex items-center justify-between border border-gray-150/50">
          <div className="flex items-center gap-2">
            <span className="text-base">💵</span>
            <span className="text-xs font-bold text-[var(--rx-text)]">Cash</span>
          </div>
          <span className="text-xs font-bold text-[#FF5A1F] cursor-pointer hover:text-orange-600 transition-colors">
            Change ›
          </span>
        </div>

        {/* Book Button */}
        <motion.button
          onClick={handleBookRide}
          disabled={isLoading || isError}
          className="w-full bg-black hover:bg-neutral-900 text-white rounded-xl font-bold text-sm border-none cursor-pointer flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          whileTap={{ scale: 0.98 }}
          style={{
            height: '52px'
          }}
        >
          Book {selectedRide.name} · ₹{calculatedFare}
        </motion.button>
      </div>
    </motion.div>
  );
}
