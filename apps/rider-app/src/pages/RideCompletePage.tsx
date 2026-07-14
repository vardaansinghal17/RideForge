import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useRideStore } from '../stores/rideStore';
import { api } from '../lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  invoiceNumber: string;
  generatedAt: string;
  ride: {
    id: string;
    from: string;
    to: string;
    distanceKm: number;
    completedAt: string;
  };
  passenger: {
    name: string;
    phone: string;
  };
  driver: {
    name: string;
    phone: string;
    vehicle: string;
    plateNumber: string;
  };
  fare: {
    estimatedFare: number;
    finalFare: number;
    surgeMultiplier: number;
    paymentMethod: string;
    paymentStatus: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string | undefined) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}

function PaymentMethodIcon({ method }: { method: string }) {
  if (method === 'UPI')  return <span className="text-lg">📱</span>;
  if (method === 'CARD') return <span className="text-lg">💳</span>;
  return <span className="text-lg">💵</span>;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function InvoiceSkeleton() {
  return (
    <div className="w-full flex flex-col gap-4 animate-pulse">
      <div className="glass-card-strong p-5 flex flex-col gap-4">
        <div className="h-9 rounded-xl bg-black/5 w-28 mx-auto" />
        <div className="h-4 rounded-lg bg-black/5 w-20 mx-auto" />
        <div className="h-px bg-black/5" />
        <div className="flex flex-col gap-3">
          <div className="h-3.5 rounded-lg bg-black/5 w-3/4" />
          <div className="h-3.5 rounded-lg bg-black/5 w-2/3" />
        </div>
        <div className="h-px bg-black/5" />
        <div className="flex justify-between">
          <div className="h-3.5 rounded-lg bg-black/5 w-20" />
          <div className="h-3.5 rounded-lg bg-black/5 w-20" />
        </div>
      </div>
      <div className="glass-card-strong p-5 flex flex-col gap-3">
        <div className="h-3.5 rounded-lg bg-black/5 w-1/3" />
        <div className="flex gap-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-8 w-8 rounded-full bg-black/5" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RideCompletePage() {
  const navigate = useNavigate();
  const { ride, reset } = useRideStore();

  // Persist rideId to sessionStorage so it survives store resets / page reloads
  const [rideId] = useState<string>(() => {
    const id = ride?.id || sessionStorage.getItem('lastRideId') || '';
    if (ride?.id) sessionStorage.setItem('lastRideId', ride.id);
    return id;
  });

  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  // Guard: no rideId → go home
  useEffect(() => {
    if (!rideId) navigate('/');
  }, [rideId, navigate]);

  // ── Fetch invoice from GET /api/payments/ride/:rideId/invoice ──────────────
  const {
    data: invoice,
    isLoading,
    isError,
    refetch,
  } = useQuery<Invoice>({
    queryKey: ['invoice', rideId],
    queryFn: async () => {
      const res = await api.get(`/payments/ride/${rideId}/invoice`);
      return res.data.data as Invoice;
    },
    enabled: !!rideId,
    retry: 2,
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleStarClick = (star: number) => {
    // Navigate to the dedicated RatingPage, pre-seeding the chosen rating
    navigate(`/rate/${rideId}`, { state: { rating: star } });
  };

  const handleSkip = () => {
    reset();
    sessionStorage.removeItem('lastRideId');
    navigate('/');
  };

  if (!rideId) return null;

  const finalFare = invoice?.fare.finalFare ?? 0;
  const paymentMethod = invoice?.fare.paymentMethod ?? 'CASH';
  const surgeMultiplier = invoice?.fare.surgeMultiplier ?? 1;

  return (
    <motion.div
      className="relative w-full min-h-screen bg-[var(--rx-bg)] flex flex-col overflow-y-auto no-scrollbar"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* ── Top: Success Hero ─────────────────────────────────────────────── */}
      <div className="flex flex-col items-center pt-12 pb-6 px-6">
        {/* Animated green ring + checkmark */}
        <motion.div
          className="w-20 h-20 rounded-full bg-[var(--rx-green-dim)] border border-[var(--rx-green)]/25 flex items-center justify-center mb-5 shadow-[0_0_32px_rgba(16,185,129,0.18)]"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }}
        >
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={3}
            stroke="var(--rx-green)"
            className="w-9 h-9"
          >
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.55, ease: 'easeOut', delay: 0.35 }}
            />
          </motion.svg>
        </motion.div>

        <motion.h1
          className="text-[22px] font-extrabold text-[var(--rx-text)] leading-tight mb-1"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
        >
          Ride completed! 🎉
        </motion.h1>
        <motion.p
          className="text-[13px] text-[var(--rx-text-3)] text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.3 }}
        >
          Thanks for riding with RideForge
        </motion.p>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <InvoiceSkeleton />
            </motion.div>
          ) : isError ? (
            // ── Error State ───────────────────────────────────────────────
            <motion.div
              key="error"
              className="glass-card-strong p-6 flex flex-col items-center gap-4"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-12 h-12 rounded-full bg-[var(--rx-red-dim)] flex items-center justify-center text-xl">
                ⚠️
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[var(--rx-text)] mb-1">
                  Couldn't load invoice
                </p>
                <p className="text-xs text-[var(--rx-text-3)]">
                  Your ride is complete — the invoice may take a moment to generate.
                </p>
              </div>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-[var(--rx-text)] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-black/80 transition-colors"
              >
                Retry
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="invoice"
              className="flex flex-col gap-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* ── Invoice Card ─────────────────────────────────────────── */}
              <div className="glass-card-strong overflow-hidden">
                {/* Header: fare + payment badge */}
                <div className="px-5 pt-5 pb-4 flex flex-col items-center border-b border-black/5">
                  <span className="text-[38px] font-black text-[var(--rx-text)] leading-none">
                    ₹{Math.round(finalFare)}
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <PaymentMethodIcon method={paymentMethod} />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--rx-text-3)]">
                      Paid via {paymentMethod}
                    </span>
                    {invoice?.fare.paymentStatus === 'COMPLETED' && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--rx-green)] bg-[var(--rx-green-dim)] px-2 py-0.5 rounded-full">
                        ✓ Settled
                      </span>
                    )}
                  </div>
                  {invoice?.invoiceNumber && (
                    <span className="text-[10px] text-[var(--rx-text-4)] mt-1 font-mono">
                      {invoice.invoiceNumber}
                    </span>
                  )}
                </div>

                {/* Route block */}
                <div className="px-5 py-4 border-b border-black/5 flex flex-col gap-3">
                  {/* From */}
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="mt-0.5 w-2 h-2 rounded-full bg-[var(--rx-green)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--rx-text-3)] mb-0.5">
                        Pickup
                      </p>
                      <p className="text-xs font-semibold text-[var(--rx-text)] truncate">
                        {invoice?.ride.from || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Connector */}
                  <div className="w-px h-4 border-l border-dashed border-[var(--rx-border-2)] ml-[3px]" />

                  {/* To */}
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="mt-0.5 w-2 h-2 rounded-sm bg-[var(--rx-text)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--rx-text-3)] mb-0.5">
                        Drop-off
                      </p>
                      <p className="text-xs font-semibold text-[var(--rx-text)] truncate">
                        {invoice?.ride.to || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Trip metrics grid */}
                <div className="px-5 py-4 grid grid-cols-3 gap-4 border-b border-black/5">
                  <div className="flex flex-col items-center">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--rx-text-3)] mb-1">
                      Distance
                    </p>
                    <p className="text-sm font-extrabold text-[var(--rx-text)]">
                      {Number(invoice?.ride.distanceKm || 0).toFixed(1)} km
                    </p>
                  </div>
                  <div className="flex flex-col items-center border-x border-black/5">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--rx-text-3)] mb-1">
                      Completed
                    </p>
                    <p className="text-xs font-bold text-[var(--rx-text)] text-center leading-tight">
                      {formatTime(invoice?.ride.completedAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--rx-text-3)] mb-1">
                      Surge
                    </p>
                    <p className="text-sm font-extrabold text-[var(--rx-text)]">
                      {surgeMultiplier > 1
                        ? <span className="text-amber-600">{surgeMultiplier}×</span>
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Driver summary */}
                {invoice?.driver.name && (
                  <div className="px-5 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF5A1F] to-orange-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-[0_0_14px_rgba(255,90,31,0.22)]">
                      {invoice.driver.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[var(--rx-text)] truncate">
                        {invoice.driver.name}
                      </p>
                      <p className="text-[11px] text-[var(--rx-text-3)] truncate">
                        {invoice.driver.vehicle}
                        {invoice.driver.plateNumber ? ` · ${invoice.driver.plateNumber}` : ''}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-[var(--rx-text-3)] bg-black/5 px-2 py-1 rounded-lg">
                      Your driver
                    </span>
                  </div>
                )}
              </div>

              {/* ── Rating Prompt Card ─────────────────────────────────── */}
              <div className="glass-card-strong px-5 py-5 flex flex-col items-center gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--rx-text-3)] text-center mb-0.5">
                    Rate your ride
                  </p>
                  <p className="text-[11px] text-[var(--rx-text-4)] text-center">
                    Tap a star to leave feedback for your driver
                  </p>
                </div>

                {/* Star row */}
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const filled = hoveredStar !== null ? star <= hoveredStar : false;
                    return (
                      <motion.button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(null)}
                        onClick={() => handleStarClick(star)}
                        className="p-1 focus:outline-none cursor-pointer"
                        whileTap={{ scale: 0.85 }}
                        whileHover={{ scale: 1.15 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill={filled ? '#F59E0B' : 'none'}
                          stroke={filled ? '#F59E0B' : 'var(--rx-text-4)'}
                          strokeWidth={1.5}
                          className="w-9 h-9 transition-colors duration-150"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11.48 3.499c.195-.39.771-.39.966 0l1.758 3.513a.925.925 0 00.7.502l3.87.564c.435.063.608.595.294.908l-2.8 2.73a.925.925 0 00-.265.815l.66 3.856c.074.433-.383.765-.769.56l-3.461-1.819a.925.925 0 00-.866 0l-3.462 1.82c-.386.204-.843-.128-.769-.56l.66-3.856a.925.925 0 00-.265-.815L2.83 9.486c-.313-.313-.14-.845.294-.908l3.87-.564a.925.925 0 00.7-.502l1.758-3.513z"
                          />
                        </svg>
                      </motion.button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-[var(--rx-text-3)]">
                  You'll be taken to the full review screen
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Skip link ───────────────────────────────────────────────────── */}
        {!isLoading && (
          <motion.div
            className="flex justify-center mt-2 pb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={handleSkip}
              className="text-[13px] text-[var(--rx-text-3)] underline underline-offset-2 cursor-pointer hover:text-[var(--rx-text-2)] transition-colors bg-transparent border-none"
            >
              Skip rating & go home
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
