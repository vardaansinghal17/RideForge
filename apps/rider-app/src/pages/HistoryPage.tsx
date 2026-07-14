import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/axios';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface RideItem {
  id: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  pickup_address: string;
  drop_address: string;
  estimated_fare: string | number;
  actual_fare: string | number | null;
  distance_km: string | number;
  duration_min: number;
  surge_multiplier: string | number | null;
  requested_at: string;
  completed_at: string | null;
  driver_name: string | null;
  make: string | null;
  model: string | null;
  plate_number: string | null;
  color: string | null;
  payment_status: string | null;
  payment_method: string | null;
  driver_rating: number | null;
}

interface RideHistoryResponse {
  rides: RideItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery<RideHistoryResponse>({
    queryKey: ['rideHistory'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get(`/rides/history?page=${pageParam}&limit=10`);
      return res.data.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });

  // Flatten all pages
  const allRides = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.rides);
  }, [data]);

  // Compute overall stats from all available rides
  const stats = useMemo(() => {
    const completedRides = allRides.filter((r) => r.status === 'COMPLETED');
    const totalCount = completedRides.length;

    const totalSpent = completedRides.reduce((sum, r) => {
      const fare = Number(r.actual_fare || r.estimated_fare || 0);
      return sum + fare;
    }, 0);

    const ratedRides = completedRides.filter((r) => r.driver_rating !== null);
    const avgRating =
      ratedRides.length > 0
        ? (ratedRides.reduce((sum, r) => sum + (r.driver_rating || 0), 0) / ratedRides.length).toFixed(1)
        : '—';

    return { totalCount, totalSpent, avgRating };
  }, [allRides]);

  // Filter rides based on active tab
  const filteredRides = useMemo(() => {
    return allRides.filter((ride) => {
      if (activeTab === 'COMPLETED') return ride.status === 'COMPLETED';
      if (activeTab === 'CANCELLED') return ride.status === 'CANCELLED';
      return true;
    });
  }, [allRides, activeTab]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      case 'REQUESTED':
      case 'ACCEPTED':
      case 'ARRIVED':
      case 'IN_PROGRESS':
        return 'info';
      default:
        return 'neutral';
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getPaymentIcon = (method: string | null) => {
    const m = (method || '').toUpperCase();
    if (m.includes('CASH')) return '💵';
    if (m.includes('UPI')) return '📱';
    return '💳';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } },
  };

  return (
    <div
      className="min-h-screen py-8 px-4 flex flex-col items-center justify-start relative overflow-y-auto"
      style={{
        background: 'radial-gradient(circle at center, #FFFFFF 0%, #F1F5F9 100%)',
      }}
    >
      {/* Background Visual Glows */}
      <div className="absolute top-1/4 left-1/4 w-[250px] h-[250px] bg-[#FF5A1F]/5 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-5 fade-up z-10">
        {/* Header */}
        <div className="flex items-center space-x-3.5 text-left">
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
            <h1 className="text-xl font-extrabold tracking-tight text-[var(--rx-text)]">Ride History</h1>
            <p className="text-xs text-[var(--rx-text-3)] font-semibold">View and rate your past trips</p>
          </div>
        </div>

        {/* Stats Strip */}
        {!isLoading && allRides.length > 0 && (
          <GlassCard className="grid grid-cols-3 divide-x divide-black/5 !py-3 !px-4 text-center" strong>
            <div>
              <span className="text-[10px] font-bold text-[var(--rx-text-3)] uppercase tracking-wider block">
                Total Rides
              </span>
              <span className="text-base font-extrabold text-[var(--rx-text)] mt-0.5 block">
                {stats.totalCount}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--rx-text-3)] uppercase tracking-wider block">
                Total Spent
              </span>
              <span className="text-base font-extrabold text-[var(--rx-text)] mt-0.5 block">
                ₹{stats.totalSpent}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--rx-text-3)] uppercase tracking-wider block">
                Avg Rating
              </span>
              <span className="text-base font-extrabold text-[#FF5A1F] mt-0.5 block">
                ★ {stats.avgRating}
              </span>
            </div>
          </GlassCard>
        )}

        {/* Filter Tabs */}
        {!isLoading && allRides.length > 0 && (
          <div className="flex bg-black/5 p-1 rounded-xl gap-1">
            {(['ALL', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all duration-150 select-none cursor-pointer ${
                  activeTab === tab
                    ? 'bg-white text-[var(--rx-text)] shadow-sm'
                    : 'text-[var(--rx-text-3)] hover:text-[var(--rx-text-2)]'
                }`}
              >
                {tab === 'ALL' ? 'All' : tab === 'COMPLETED' ? 'Completed' : 'Cancelled'}
              </button>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-full h-[180px] rounded-2xl bg-black/5 border border-black/5 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <GlassCard className="text-center p-8 flex flex-col items-center gap-4" strong>
            <div className="w-12 h-12 rounded-full bg-[var(--rx-red-dim)] flex items-center justify-center text-[var(--rx-red)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--rx-text)]">Failed to load history</h3>
              <p className="text-xs text-[var(--rx-text-3)] font-medium mt-1">
                There was a problem communicating with our servers.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => refetch()}>
              Retry loading
            </Button>
          </GlassCard>
        )}

        {/* Empty State */}
        {!isLoading && !isError && filteredRides.length === 0 && (
          <GlassCard className="text-center p-8 flex flex-col items-center gap-4" strong>
            <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center text-[var(--rx-text-3)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--rx-text)]">No trips found</h3>
              <p className="text-xs text-[var(--rx-text-3)] font-medium mt-1">
                {activeTab === 'ALL'
                  ? 'Your booked trips will appear here.'
                  : `You don't have any ${activeTab.toLowerCase()} trips.`}
              </p>
            </div>
            {activeTab === 'ALL' && (
              <Button variant="primary" size="sm" onClick={() => navigate('/ride')}>
                Book a Ride
              </Button>
            )}
          </GlassCard>
        )}

        {/* Rides List */}
        {!isLoading && !isError && filteredRides.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <AnimatePresence mode="popLayout">
              {filteredRides.map((ride) => {
                const isCompleted = ride.status === 'COMPLETED';
                const isCancelled = ride.status === 'CANCELLED';
                const surge = Number(ride.surge_multiplier || 1);

                return (
                  <motion.div key={ride.id} variants={cardVariants} layout>
                    <GlassCard className="text-left !p-5 flex flex-col gap-4" strong>
                      {/* Top Header Row */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-[var(--rx-text-3)] font-bold block mb-1">
                            {formatDate(ride.requested_at)}
                          </span>
                          <Badge variant={getStatusVariant(ride.status)} dot={false}>
                            {ride.status}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-base font-extrabold block leading-none ${
                              isCancelled ? 'text-[var(--rx-text-3)] line-through' : 'text-[var(--rx-text)]'
                            }`}
                          >
                            ₹{ride.actual_fare || ride.estimated_fare}
                          </span>
                          <span className="text-[10px] text-[var(--rx-text-3)] font-bold mt-1 block">
                            {ride.distance_km} km • {ride.duration_min} min
                          </span>
                        </div>
                      </div>

                      {/* Route Timeline */}
                      <div className="relative border-l-2 border-dashed border-black/10 pl-5 ml-1.5 space-y-3.5 my-1 text-[13px]">
                        {/* Pickup Circle */}
                        <div className="absolute -left-[6px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#FF5A1F] bg-white" />
                        {/* Dropoff Square */}
                        <div className="absolute -left-[5px] bottom-[5px] w-2 h-2 bg-black rounded-sm" />

                        <div className="leading-tight">
                          <span className="text-[9px] text-[var(--rx-text-3)] font-bold uppercase tracking-wider block mb-0.5">
                            Pickup Address
                          </span>
                          <p className="text-xs text-[var(--rx-text-1)] font-semibold truncate">
                            {ride.pickup_address}
                          </p>
                        </div>

                        <div className="leading-tight">
                          <span className="text-[9px] text-[var(--rx-text-3)] font-bold uppercase tracking-wider block mb-0.5">
                            Dropoff Address
                          </span>
                          <p className="text-xs text-[var(--rx-text-1)] font-semibold truncate">
                            {ride.drop_address}
                          </p>
                        </div>
                      </div>

                      {/* Metrics/Surge Multiplier */}
                      {surge > 1 && (
                        <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-1 rounded-lg w-max text-[11px] font-bold">
                          ⚡ {surge}x Surge Applied
                        </div>
                      )}

                      {/* Driver & Payment Section (only if Assigned/Completed) */}
                      {(isCompleted || (isCancelled && ride.driver_name)) && (
                        <div className="border-t border-black/5 pt-4 mt-1 flex flex-col gap-3.5">
                          {/* Driver Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF5A1F] to-orange-600 flex items-center justify-center text-white font-extrabold text-xs shadow-sm">
                                {(ride.driver_name?.[0] || 'D').toUpperCase()}
                              </div>
                              <div className="leading-tight text-left">
                                <span className="text-[9px] text-[var(--rx-text-3)] font-bold uppercase tracking-wider block">
                                  Driver Partner
                                </span>
                                <span className="text-xs text-[var(--rx-text)] font-bold">
                                  {ride.driver_name || 'Driver assigned'}
                                </span>
                                <span className="text-[10px] text-[var(--rx-text-3)] block font-semibold mt-0.5">
                                  {ride.make} {ride.model} • {ride.plate_number}
                                </span>
                              </div>
                            </div>

                            {/* Payment Method badge */}
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[9px] text-[var(--rx-text-3)] font-bold uppercase tracking-wider block">
                                Payment Details
                              </span>
                              <div className="flex items-center gap-1 text-xs font-bold text-[var(--rx-text-2)]">
                                <span className="text-sm">{getPaymentIcon(ride.payment_method)}</span>
                                <span className="capitalize">{ride.payment_method?.toLowerCase() || 'Cash'}</span>
                                <span className="text-[10px] uppercase bg-black/5 text-[var(--rx-text-2)] px-1.5 py-0.5 rounded ml-1 tracking-wider">
                                  {ride.payment_status || 'PAID'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Ratings Row */}
                          {isCompleted && (
                            <div className="flex items-center justify-between border-t border-dashed border-black/5 pt-3.5 mt-0.5">
                              <span className="text-xs text-[var(--rx-text-3)] font-bold">
                                {ride.driver_rating ? 'Your Rating' : 'Feedback'}
                              </span>

                              {ride.driver_rating ? (
                                <div className="flex items-center gap-0.5 text-amber-500">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <svg
                                      key={star}
                                      viewBox="0 0 24 24"
                                      fill={star <= (ride.driver_rating || 0) ? 'currentColor' : 'none'}
                                      stroke="currentColor"
                                      strokeWidth={1.5}
                                      className="w-4 h-4"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M11.48 3.499c.195-.39.771-.39.966 0l1.758 3.513a.925.925 0 00.7.502l3.87.564c.435.063.608.595.294.908l-2.8 2.73a.925.925 0 00-.265.815l.66 3.856c.074.433-.383.765-.769.56l-3.461-1.819a.925.925 0 00-.866 0l-3.462 1.82c-.386.204-.843-.128-.769-.56l.66-3.856a.925.925 0 00-.265-.815L2.83 9.486c-.313-.313-.14-.845.294-.908l3.87-.564a.925.925 0 00.7-.502l1.758-3.513z"
                                      />
                                    </svg>
                                  ))}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/rate/${ride.id}`)}
                                  className="text-xs font-bold text-[#FF5A1F] hover:text-[#e54e18] flex items-center gap-1 select-none cursor-pointer bg-transparent border-none outline-none transition-colors"
                                >
                                  Rate this ride
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    className="w-3.5 h-3.5"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </GlassCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Load More Button */}
        {hasNextPage && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => fetchNextPage()}
              loading={isFetchingNextPage}
            >
              Load more rides
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
