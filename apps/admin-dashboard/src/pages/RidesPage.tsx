import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { DataTable } from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import { Badge, rideStatusBadge } from '../components/ui/Badge';

export default function RidesPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['rides', page, status],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 15 };
      if (status) params.status = status;
      const res = await api.get('/admin/rides', { params });
      return res.data.data;
    },
    keepPreviousData: true,
  });

  const rides: any[] = data?.rides || [];
  const pagination = data?.pagination;

  const columns: Column<any>[] = [
    {
      key: 'id',
      header: 'Ride ID',
      width: '100px',
      render: (row) => (
        <span className="font-mono text-xs text-[var(--rx-text-3)]" title={row.id}>
          {row.id.slice(0, 8)}…
        </span>
      ),
    },
    {
      key: 'rider',
      header: 'Rider / Passenger',
      width: '160px',
      render: (row) => (
        <div>
          <p className="text-sm font-semibold text-[var(--rx-text)]">{row.rider_name}</p>
          <p className="text-xs text-[var(--rx-text-3)]">{row.rider_phone}</p>
        </div>
      ),
    },
    {
      key: 'driver',
      header: 'Assigned Driver',
      width: '160px',
      render: (row) => row.driver_name ? (
        <div>
          <p className="text-sm font-semibold text-[var(--rx-text)]">{row.driver_name}</p>
          <p className="text-xs text-[var(--rx-text-3)]">{row.driver_phone}</p>
        </div>
      ) : (
        <span className="text-xs italic text-[var(--rx-text-4)]">Unassigned / Searching</span>
      ),
    },
    {
      key: 'route',
      header: 'Pickup & Drop',
      width: '260px',
      render: (row) => (
        <div className="text-xs max-w-[240px]">
          <p className="truncate font-medium text-[var(--rx-text-2)]" title={row.pickup_address}>
            <span className="text-emerald-500 font-bold mr-1">●</span> {row.pickup_address}
          </p>
          <p className="truncate font-medium text-[var(--rx-text-2)] mt-1" title={row.drop_address}>
            <span className="text-red-500 font-bold mr-1">■</span> {row.drop_address}
          </p>
        </div>
      ),
    },
    {
      key: 'distance_km',
      header: 'Distance',
      width: '80px',
      render: (row) => <span className="font-medium text-xs">{Number(row.distance_km).toFixed(1)} km</span>,
    },
    {
      key: 'final_fare',
      header: 'Fare',
      width: '100px',
      render: (row) => (
        <div>
          <p className="font-bold text-sm text-[var(--rx-text)]">₹{Number(row.final_fare || row.estimated_fare).toLocaleString('en-IN')}</p>
          {Number(row.surge_multiplier) > 1 && (
            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">
              ⚡ {row.surge_multiplier}x Surge
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => <Badge variant={rideStatusBadge(row.status)}>{row.status}</Badge>,
    },
    {
      key: 'requested_at',
      header: 'Requested At',
      width: '120px',
      render: (row) => (
        <span className="text-xs text-[var(--rx-text-3)]">
          {new Date(row.requested_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          <span className="block text-[10px]">
            {new Date(row.requested_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </span>
        </span>
      ),
    },
  ];

  const statuses = [
    { label: 'All Statuses', value: '' },
    { label: 'Requested', value: 'REQUESTED' },
    { label: 'Accepted', value: 'ACCEPTED' },
    { label: 'Arrived', value: 'ARRIVED' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-[var(--rx-text)]">Rides</h2>
            {/* Live indicator */}
            <span className="flex items-center gap-1.5 ml-1">
              <span
                className={`w-2 h-2 rounded-full ${isFetching ? 'bg-orange-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--rx-text-4)]">
                {isFetching ? 'Updating…' : 'Live'}
              </span>
            </span>
          </div>
          <p className="text-sm text-[var(--rx-text-3)] mt-0.5">
            Platform ride history, route patterns, and real-time status monitoring
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border border-[var(--rx-border)] rounded-xl p-1 gap-0.5 self-start w-fit">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => { setStatus(s.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              status === s.value
                ? 'bg-[var(--rx-blue)] text-white shadow-sm'
                : 'text-[var(--rx-text-2)] hover:bg-zinc-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={rides}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        emptyMessage="No rides found matching this status filter"
      />
    </div>
  );
}
