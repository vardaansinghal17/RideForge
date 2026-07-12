import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface RideItem {
  id: string;
  status: string;
  pickup_address: string;
  drop_address: string;
  estimated_fare: string | number;
  actual_fare: string | number | null;
  distance_km: string | number;
  duration_min: number;
  requested_at: string;
  driver_name: string | null;
  make: string | null;
  model: string | null;
  plate_number: string | null;
  payment_status: string | null;
  driver_rating: number | null;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [ratingStates, setRatingStates] = useState<{ [rideId: string]: { rating: number; hover: number } }>({});

  const { data, isLoading, error } = useQuery<{ rides: RideItem[] }>({
    queryKey: ['rideHistory'],
    queryFn: async () => {
      const res = await api.get('/rides/history?page=1&limit=50');
      return res.data.data;
    },
  });

  const rateMutation = useMutation({
    mutationFn: async ({ rideId, rating }: { rideId: string; rating: number }) => {
      await api.post(`/rides/${rideId}/rate`, { rating });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rideHistory'] });
    },
  });

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
    });
  };

  const handleRate = (rideId: string, rating: number) => {
    rateMutation.mutate({ rideId, rating });
  };

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

      <div className="w-full max-w-md space-y-6 fade-up">
        {/* Header */}
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
            <h1 className="text-xl font-bold text-[var(--rx-text)]">Ride History</h1>
            <p className="text-xs text-[var(--rx-text-3)]">View and rate your past trips</p>
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-full h-[160px] rounded-2xl bg-black/5 border border-black/5 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!data || data.rides.length === 0) && (
          <GlassCard className="text-center p-8" strong>
            <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mx-auto mb-4 text-[var(--rx-text-3)]">
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
            <h3 className="text-sm font-bold text-[var(--rx-text)] mb-1">No Rides Yet</h3>
            <p className="text-xs text-[var(--rx-text-3)] mb-5">
              Rides you book will show up here.
            </p>
            <Button variant="primary" size="sm" onClick={() => navigate('/ride')}>
              Book a Ride
            </Button>
          </GlassCard>
        )}

        {/* Rides List */}
        {!isLoading && data && data.rides.length > 0 && (
          <div className="space-y-4">
            {data.rides.map((ride) => (
              <GlassCard key={ride.id} className="text-left" strong>
                {/* Top header row */}
                <div className="flex justify-between items-start mb-3.5">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--rx-text-3)] font-semibold block mb-0.5">
                      {formatDate(ride.requested_at)}
                    </span>
                    <Badge variant={getStatusVariant(ride.status)}>{ride.status}</Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-[var(--rx-text)]">
                      ₹{ride.actual_fare || ride.estimated_fare}
                    </span>
                    <span className="text-[10px] text-[var(--rx-text-3)] block font-medium">
                      {ride.distance_km} km • {ride.duration_min} min
                    </span>
                  </div>
                </div>

                {/* Pickup and Dropoff timeline */}
                <div className="relative border-l-2 border-[var(--rx-border)] pl-4 ml-1.5 space-y-4 my-4">
                  {/* Pickup circle connector */}
                  <div className="absolute -left-[6px] top-1.5 w-[10px] h-[10px] rounded-full border-2 border-[#FF5A1F] bg-[#FFFFFF]" />
                  {/* Dropoff square connector */}
                  <div className="absolute -left-[5px] bottom-[6px] w-[8px] h-[8px] bg-black rounded-sm" />

                  <div>
                    <span className="text-[10px] text-[var(--rx-text-3)] block font-medium">
                      Pickup Address
                    </span>
                    <p className="text-xs text-[var(--rx-text-1)] font-semibold truncate">
                      {ride.pickup_address}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--rx-text-3)] block font-medium">
                      Dropoff Address
                    </span>
                    <p className="text-xs text-[var(--rx-text-1)] font-semibold truncate">
                      {ride.drop_address}
                    </p>
                  </div>
                </div>

                {/* Driver information & rating section */}
                {ride.status === 'COMPLETED' && (
                  <div className="border-t border-[var(--rx-border)] pt-3.5 mt-3.5 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#FF5A1F]/10 flex items-center justify-center text-[#FF5A1F] text-xs font-bold">
                        {ride.driver_name ? ride.driver_name[0].toUpperCase() : 'D'}
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--rx-text-3)] block font-medium leading-none">
                          Driver
                        </span>
                        <span className="text-xs text-[var(--rx-text)] font-semibold">
                          {ride.driver_name || 'Driver Partner'}
                        </span>
                      </div>
                    </div>

                    {/* Rate Driver Section */}
                    <div>
                      {ride.driver_rating ? (
                        <div className="flex items-center space-x-1 text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <svg
                              key={s}
                              className={`w-4 h-4 ${
                                s <= ride.driver_rating! ? 'fill-current' : 'text-slate-200'
                              }`}
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-0.5 text-slate-300 hover:text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => {
                            const rState = ratingStates[ride.id] || { rating: 0, hover: 0 };
                            return (
                              <button
                                key={s}
                                type="button"
                                onMouseEnter={() =>
                                  setRatingStates((prev) => ({
                                    ...prev,
                                    [ride.id]: { ...rState, hover: s },
                                  }))
                                }
                                onMouseLeave={() =>
                                  setRatingStates((prev) => ({
                                    ...prev,
                                    [ride.id]: { ...rState, hover: 0 },
                                  }))
                                }
                                onClick={() => handleRate(ride.id, s)}
                                className="focus:outline-none transition-colors p-0.5"
                                disabled={rateMutation.isPending}
                              >
                                <svg
                                  className={`w-4 h-4 ${
                                    s <= (rState.hover || rState.rating)
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'fill-none stroke-current stroke-[1.5]'
                                  }`}
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M11.48 3.499c.15-.316.593-.316.743 0l2.233 4.526 4.985.725c.349.05.488.48.236.726l-3.607 3.516.851 4.965c.06.349-.31.62-.62.455L12 16.75l-4.462 2.348c-.31.162-.68-.109-.62-.455l.851-4.965-3.607-3.516c-.252-.246-.112-.676.236-.726l4.985-.725 2.233-4.526z"
                                  />
                                </svg>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
