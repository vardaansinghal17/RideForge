import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';

export default function RatingsPage() {
  const [page, setPage] = useState(1);

  const { data: ratingData, isLoading } = useQuery({
    queryKey: ['myRatings', page],
    queryFn: async () => {
      const res = await api.get(`/ratings/my-ratings?page=${page}&limit=5`);
      return res.data.data;
    },
  });

  const ratings = ratingData?.ratings || [];
  const averageRating = ratingData?.averageRating || 5.0;
  const totalRatings = ratingData?.total || 0;
  const pagination = ratingData?.pagination || { page: 1, totalPages: 1 };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">Ratings & Feedback</h2>
        <p className="text-sm text-slate-500 mt-1">Review ratings and comments left by your past passengers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Rating Summary Card (Col Span 1) */}
        <div>
          <GlassCard className="p-8 text-center space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Average Score</h3>
            <div className="text-6xl font-black text-[#FF5A1F] font-mono">
              {Number(averageRating).toFixed(2)}
            </div>
            <div className="flex items-center justify-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-2xl ${
                    star <= Math.round(averageRating) ? 'text-amber-400' : 'text-slate-200'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Calculated from {totalRatings} rated trips
            </p>
          </GlassCard>
        </div>

        {/* Comments List (Col Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-black text-slate-450 uppercase tracking-wider pl-1">
            Passenger Reviews
          </h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-[var(--rx-blue)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {ratings.length === 0 ? (
                <GlassCard className="py-16 text-center text-sm text-slate-400 font-medium">
                  No passenger reviews or comments received yet.
                </GlassCard>
              ) : (
                ratings.map((item: any, idx: number) => {
                  const date = new Date(item.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  return (
                    <GlassCard key={idx} className="p-5 text-left space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-bold text-slate-700 block">
                            {item.rider_name || 'Passenger'}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {date}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-amber-600 text-xs font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          <span>{item.rating}</span>
                          <span className="text-[10px]">★</span>
                        </div>
                      </div>

                      {item.comment && (
                        <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200/60 italic leading-relaxed">
                          "{item.comment}"
                        </p>
                      )}

                      <div className="text-[10px] text-slate-450 truncate pt-1 border-t border-slate-100 flex items-center space-x-1.5">
                        <span className="font-semibold">Route:</span>
                        <span className="text-slate-550">{item.pickup_address}</span>
                        <span>&rarr;</span>
                        <span className="text-slate-550">{item.drop_address}</span>
                      </div>
                    </GlassCard>
                  );
                })
              )}

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-10 border border-slate-200 bg-white"
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-bold text-slate-500">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="h-10 border border-slate-200 bg-white"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
