import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { StatCard } from '../components/ui/StatCard';
import { RevenueChart } from '../components/charts/RevenueChart';

type IntervalType = 'daily' | 'weekly' | 'monthly';

export default function AnalyticsPage() {
  const [interval, setInterval] = useState<IntervalType>('daily');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', interval],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/revenue', { params: { interval } });
      return res.data.data;
    },
  });

  const chartData = analytics?.chartData || [];
  const summary = analytics?.summary || {};

  const intervals: { label: string; value: IntervalType }[] = [
    { label: 'Daily Breakdown', value: 'daily' },
    { label: 'Weekly Summary', value: 'weekly' },
    { label: 'Monthly Summary', value: 'monthly' },
  ];

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-[var(--rx-text)]">Financial Analytics</h2>
          <p className="text-sm text-[var(--rx-text-3)] mt-0.5">
            Platform revenue analysis, booking patterns, and average transaction values
          </p>
        </div>

        {/* Interval Selector */}
        <div className="flex bg-white border border-[var(--rx-border)] rounded-xl p-1 gap-0.5">
          {intervals.map((i) => (
            <button
              key={i.value}
              onClick={() => setInterval(i.value)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                interval === i.value
                  ? 'bg-[var(--rx-blue)] text-white shadow-sm'
                  : 'text-[var(--rx-text-2)] hover:bg-zinc-50'
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Revenue (Period)"
          value={isLoading ? '…' : `₹${Number(summary.totalRevenue || 0).toLocaleString('en-IN')}`}
          subtitle={`Over the selected ${interval} interval`}
          color="green"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Completed Rides"
          value={isLoading ? '…' : Number(summary.completedRides || 0).toLocaleString()}
          subtitle="Successful completions"
          color="orange"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
        />
        <StatCard
          title="Avg Ride Fare"
          value={isLoading ? '…' : `₹${Math.round(Number(summary.averageFare || 0)).toLocaleString('en-IN')}`}
          subtitle="Mean payment per booking"
          color="purple"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
        />
        <StatCard
          title="Avg Distance"
          value={isLoading ? '…' : `${Number(summary.averageDistance || 0).toFixed(1)} km`}
          subtitle="Mean route length"
          color="blue"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
      </div>

      {/* Main Graph Card */}
      <div className="glass-card p-5">
        <h3 className="font-bold text-[var(--rx-text)]">Revenue and Rides Area Chart</h3>
        <p className="text-xs text-[var(--rx-text-3)] mb-5">Showing details per {interval} increment</p>
        {isLoading ? (
          <div className="h-[320px] bg-zinc-100 rounded-xl animate-pulse" />
        ) : (
          <RevenueChart data={chartData} height={320} />
        )}
      </div>
    </div>
  );
}
