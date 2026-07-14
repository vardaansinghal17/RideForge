import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { DataTable } from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import { Badge, paymentStatusBadge, paymentMethodBadge } from '../components/ui/Badge';

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['payments', page, status],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 15 };
      if (status) params.status = status;
      const res = await api.get('/admin/payments', { params });
      return res.data.data;
    },
    keepPreviousData: true,
  });

  const payments: any[] = data?.payments || [];
  const pagination = data?.pagination;

  const columns: Column<any>[] = [
    {
      key: 'payment_id',
      header: 'Payment ID',
      width: '100px',
      render: (row) => (
        <span className="font-mono text-xs text-[var(--rx-text-3)]" title={row.payment_id}>
          {row.payment_id.slice(0, 8)}…
        </span>
      ),
    },
    {
      key: 'ride_id',
      header: 'Ride ID',
      width: '100px',
      render: (row) => (
        <span className="font-mono text-xs text-[var(--rx-text-3)]" title={row.ride_id}>
          {row.ride_id.slice(0, 8)}…
        </span>
      ),
    },
    {
      key: 'rider',
      header: 'Rider',
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
      header: 'Driver',
      width: '160px',
      render: (row) => (
        <div>
          <p className="text-sm font-semibold text-[var(--rx-text)]">{row.driver_name}</p>
          <p className="text-xs text-[var(--rx-text-3)]">{row.driver_phone}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '100px',
      render: (row) => <span className="font-bold text-sm text-[var(--rx-text)]">₹{Number(row.amount).toLocaleString('en-IN')}</span>,
    },
    {
      key: 'payment_method',
      header: 'Method',
      width: '110px',
      render: (row) => <Badge variant={paymentMethodBadge(row.payment_method)}>{row.payment_method}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      render: (row) => <Badge variant={paymentStatusBadge(row.status)}>{row.status}</Badge>,
    },
    {
      key: 'created_at',
      header: 'Processed At',
      width: '120px',
      render: (row) => (
        <span className="text-xs text-[var(--rx-text-3)]">
          {new Date(row.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          <span className="block text-[10px]">
            {new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </span>
        </span>
      ),
    },
  ];

  const statuses = [
    { label: 'All Payments', value: '' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Failed', value: 'FAILED' },
  ];

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h2 className="text-2xl font-black text-[var(--rx-text)]">Payments</h2>
        <p className="text-sm text-[var(--rx-text-3)] mt-0.5">
          Track transaction statuses, rider billing, and payment methods
        </p>
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
        data={payments}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        emptyMessage="No payments found matching this status filter"
      />
    </div>
  );
}
