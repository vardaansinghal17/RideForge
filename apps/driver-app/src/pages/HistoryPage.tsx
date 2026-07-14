import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function HistoryPage() {
  const [page, setPage] = useState(1);

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['history', page],
    queryFn: async () => {
      const res = await api.get(`/drivers/history?page=${page}&limit=5`);
      return res.data.data;
    },
  });

  const rides = historyData?.rides || [];
  const pagination = historyData?.pagination || { page: 1, totalPages: 1 };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">Booking History</h2>
        <p className="text-sm text-slate-500 mt-1">Review your completed or cancelled customer bookings</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-[var(--rx-blue)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {rides.length === 0 ? (
            <GlassCard className="py-16 text-center text-sm text-slate-400 font-medium">
              No rides recorded in your history yet.
            </GlassCard>
          ) : (
            rides.map((ride: any) => {
              const formattedDate = new Date(ride.requested_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <GlassCard key={ride.id} className="p-6 space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      {formattedDate}
                    </span>
                    <Badge variant={ride.status === 'COMPLETED' ? 'success' : 'error'}>
                      {ride.status}
                    </Badge>
                  </div>

                  {/* Timeline Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-l-2 border-slate-100 pl-4 py-1">
                    <div className="flex items-start space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <div className="text-left">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pickup Address</span>
                        <span className="text-sm font-semibold text-slate-700 block mt-0.5">
                          {ride.pickup_address}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                      <div className="text-left">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Drop Address</span>
                        <span className="text-sm font-semibold text-slate-700 block mt-0.5">
                          {ride.drop_address}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Details Row */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-650 text-xs">
                        {(ride.rider_name || 'R')[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Passenger</span>
                        <span className="font-bold text-slate-700 block mt-0.5">{ride.rider_name || 'Rider'}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Earnings</span>
                      <span className="font-extrabold text-slate-900 text-base block mt-0.5">
                        ₹{ride.final_fare || ride.fare}
                      </span>
                    </div>
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
  );
}
