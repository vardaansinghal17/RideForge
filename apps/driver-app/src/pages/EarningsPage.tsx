import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { GlassCard } from '../components/ui/GlassCard';

type Period = 'today' | 'week' | 'month';

export default function EarningsPage() {
  const [period, setPeriod] = useState<Period>('today');

  const { data: earnings, isLoading } = useQuery({
    queryKey: ['earnings', period],
    queryFn: async () => {
      const res = await api.get(`/drivers/earnings?period=${period}`);
      return res.data.data;
    },
  });

  // Calculate chart metrics
  const dailyData = earnings?.dailyBreakdown || [];
  const maxEarnings = dailyData.reduce((max: number, d: any) => Math.max(max, d.earnings), 100);

  return (
    <div className="space-y-8 animate-fade-in text-left">
      
      {/* Page Header with Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">Earnings & Performance</h2>
          <p className="text-sm text-slate-500 mt-1">Track your driving income, completed rides, and activity trends</p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-80">
          {(['today', 'week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize ${
                period === p
                  ? 'bg-[#FF5A1F] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-[var(--rx-blue)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Stats Column (Col Span 1) */}
          <div className="space-y-6">
            
            {/* Primary Stats */}
            <GlassCard className="p-6 relative overflow-hidden">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Income</span>
              <span className="text-4xl font-black text-slate-800 block mt-2">₹{earnings?.periodEarnings || 0}</span>
              <span className="text-[11px] text-emerald-600 font-semibold block mt-3.5 flex items-center">
                <svg className="w-4 h-4 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                +12.4% vs last period
              </span>
            </GlassCard>

            <GlassCard className="p-6">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Completed Rides</span>
              <span className="text-4xl font-black text-slate-800 block mt-2">{earnings?.periodRides || 0}</span>
              <span className="text-xs text-slate-500 font-semibold block mt-3.5">
                Avg. ₹{earnings?.periodRides ? Math.round(earnings.periodEarnings / earnings.periodRides) : 0} per trip
              </span>
            </GlassCard>

            {/* Sub Stats Grid */}
            <GlassCard className="p-5 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Distance</span>
                <span className="text-lg font-black text-slate-850 block mt-1">{(earnings?.periodDistance || 0).toFixed(1)} km</span>
              </div>
              <div className="border-l border-slate-100 pl-4">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Lifetime Income</span>
                <span className="text-lg font-black text-slate-850 block mt-1">₹{earnings?.totalEarnings || 0}</span>
              </div>
            </GlassCard>
            
          </div>

          {/* Daily Trend Column (Col Span 2) */}
          <div className="lg:col-span-2">
            <GlassCard className="p-8 h-full flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Daily Earnings Trend</h3>
                <p className="text-xs text-slate-500 mt-1">Daily income breakdown over the current interval</p>
              </div>

              {dailyData.length === 0 ? (
                <div className="py-24 text-center text-sm text-slate-450 font-medium">
                  No ride activity recorded for this period.
                </div>
              ) : (
                <div className="space-y-6 mt-8">
                  {/* Chart Visualizer */}
                  <div className="h-64 flex items-end justify-between space-x-4 pt-6 px-2 relative border-b border-slate-100">
                    {dailyData.map((d: any, idx: number) => {
                      const pct = Math.max(8, (d.earnings / maxEarnings) * 100);
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1 text-xs font-black text-white pointer-events-none z-10 whitespace-nowrap shadow-md">
                            ₹{d.earnings}
                          </div>
                          
                          {/* Bar */}
                          <div
                            className="w-full max-w-[32px] bg-gradient-to-t from-[#FF5A1F]/30 to-[#FF5A1F] hover:to-orange-600 rounded-t-lg transition-all duration-300 origin-bottom cursor-pointer"
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Day Labels */}
                  <div className="flex justify-between text-xs font-bold text-slate-500 tracking-wider">
                    {dailyData.map((d: any, idx: number) => {
                      const dayLabel = new Date(d.day).toLocaleDateString('en-IN', { weekday: 'short' });
                      return (
                        <span key={idx} className="flex-1 text-center truncate">
                          {dayLabel}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </GlassCard>
          </div>

        </div>
      )}

    </div>
  );
}
