import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { StatCard } from '../components/ui/StatCard';
import { RevenueChart } from '../components/charts/RevenueChart';
import { Badge, rideStatusBadge } from '../components/ui/Badge';

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
      <svg className="w-3.5 h-3.5 fill-amber-400" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {Number(rating || 0).toFixed(1)}
    </span>
  );
}

const rankColors = ['#FF5A1F', '#F59E0B', '#10B981'];
const rankLabels = ['🥇', '🥈', '🥉'];

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data.data;
    },
    refetchInterval: 30_000,
  });

  const overview = stats?.overview || {};
  const ridesByStatus: any[] = stats?.ridesByStatus || [];
  const revenueByDay: any[] = stats?.revenueByDay || [];
  const topDrivers: any[] = stats?.topDrivers || [];

  const totalRidesForStatus = ridesByStatus.reduce((s: number, r: any) => s + Number(r.count), 0) || 1;

  return (
    <div className="space-y-7 fade-up">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-[var(--rx-text)]">Overview</h2>
        <p className="text-sm text-[var(--rx-text-3)] mt-0.5">Platform-wide metrics at a glance</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Users"
          value={isLoading ? '…' : (overview.totalUsers ?? 0).toLocaleString()}
          subtitle={`${overview.totalRiders ?? 0} riders · ${overview.totalDrivers ?? 0} drivers`}
          color="blue"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatCard
          title="Total Rides"
          value={isLoading ? '…' : (overview.totalRides ?? 0).toLocaleString()}
          subtitle={`${overview.completedRides ?? 0} completed`}
          color="orange"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>}
        />
        <StatCard
          title="Today's Revenue"
          value={isLoading ? '…' : `₹${(overview.todayRevenue ?? 0).toLocaleString('en-IN')}`}
          subtitle="Completed rides today"
          color="green"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
        <StatCard
          title="Total Revenue"
          value={isLoading ? '…' : `₹${(overview.totalRevenue ?? 0).toLocaleString('en-IN')}`}
          subtitle="All-time platform earnings"
          color="purple"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <StatCard
          title="Active Drivers"
          value={isLoading ? '…' : (overview.activeDrivers ?? 0)}
          subtitle="Currently online"
          color="green"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M2 12h2m16 0h2m-4.172-7.828l-1.414 1.414M7.586 16.414l-1.414 1.414M4.172 4.172l1.414 1.414M16.414 16.414l1.414 1.414" /></svg>}
        />
        <StatCard
          title="Pending Approval"
          value={isLoading ? '…' : (overview.pendingApprovals ?? 0)}
          subtitle="Drivers awaiting review"
          color={overview.pendingApprovals > 0 ? 'red' : 'green'}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-5 gap-5">
        {/* Revenue Chart */}
        <div className="col-span-3 glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-[var(--rx-text)]">Revenue Trend</h3>
              <p className="text-xs text-[var(--rx-text-3)] mt-0.5">Last 14 days — revenue & ride volume</p>
            </div>
          </div>
          {isLoading ? (
            <div className="h-[260px] bg-zinc-100 rounded-xl animate-pulse" />
          ) : (
            <RevenueChart data={revenueByDay} height={260} />
          )}
        </div>

        {/* Rides by status */}
        <div className="col-span-2 glass-card p-5">
          <h3 className="font-bold text-[var(--rx-text)] mb-1">Rides by Status</h3>
          <p className="text-xs text-[var(--rx-text-3)] mb-5">All-time distribution</p>
          <div className="space-y-3">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 w-28 bg-zinc-100 rounded animate-pulse" />
                    <div className="h-2 w-full bg-zinc-100 rounded animate-pulse" />
                  </div>
                ))
              : ridesByStatus.map((r: any) => {
                  const pct = Math.round((Number(r.count) / totalRidesForStatus) * 100);
                  const v = rideStatusBadge(r.status);
                  const barColors: Record<string, string> = {
                    success: '#10B981',
                    error: '#EF4444',
                    warning: '#F59E0B',
                    info: '#FF5A1F',
                    purple: '#8B5CF6',
                    neutral: '#71717a',
                  };
                  return (
                    <div key={r.status}>
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant={v}>{r.status}</Badge>
                        <span className="text-xs font-bold text-[var(--rx-text-2)]">{Number(r.count).toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: barColors[v] || '#71717a' }}
                        />
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>

      {/* Top Drivers */}
      <div className="glass-card p-5">
        <h3 className="font-bold text-[var(--rx-text)] mb-1">Top Performing Drivers</h3>
        <p className="text-xs text-[var(--rx-text-3)] mb-5">Ranked by total earnings</p>
        <div className="grid grid-cols-5 gap-4">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-zinc-50 rounded-xl p-4 space-y-2 animate-pulse">
                  <div className="w-10 h-10 bg-zinc-200 rounded-full mx-auto" />
                  <div className="h-3 bg-zinc-200 rounded w-3/4 mx-auto" />
                  <div className="h-2 bg-zinc-100 rounded w-1/2 mx-auto" />
                </div>
              ))
            : topDrivers.slice(0, 5).map((driver: any, i: number) => (
                <div key={driver.id || i} className="bg-zinc-50/80 border border-[var(--rx-border)] rounded-xl p-4 text-center hover:shadow-sm transition-shadow">
                  <div className="text-2xl mb-2">{rankLabels[i] || `#${i + 1}`}</div>
                  <div
                    className="w-10 h-10 rounded-full mx-auto mb-2.5 flex items-center justify-center font-bold text-sm text-white"
                    style={{ background: rankColors[i] || '#FF5A1F' }}
                  >
                    {(driver.driver_name || 'D')[0].toUpperCase()}
                  </div>
                  <p className="text-sm font-bold text-[var(--rx-text)] truncate">{driver.driver_name || '—'}</p>
                  <p className="text-xs font-semibold text-emerald-600 mt-1">₹{Number(driver.totalearnings || 0).toLocaleString('en-IN')}</p>
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <span className="text-[10px] text-[var(--rx-text-3)]">{driver.totalrides} rides</span>
                    <StarRating rating={driver.rating} />
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
