import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { DataTable } from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';

type ApprovalFilter = '' | 'pending' | 'approved';

export default function DriversPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ApprovalFilter>('');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['drivers', page, filter],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 15 };
      if (filter === 'pending') params.approved = 'false';
      else if (filter === 'approved') params.approved = 'true';
      const res = await api.get('/admin/drivers', { params });
      return res.data.data;
    },
    keepPreviousData: true,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ driverId, isApproved }: { driverId: string; isApproved: boolean }) => {
      await api.patch(`/admin/drivers/${driverId}/approve`, { isApproved });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      setActioningId(null);
    },
    onError: () => setActioningId(null),
  });

  const handleApproval = (driverId: string, approve: boolean) => {
    if (confirm(`Are you sure you want to ${approve ? 'approve' : 'reject'} this driver?`)) {
      setActioningId(driverId);
      approveMutation.mutate({ driverId, isApproved: approve });
    }
  };

  const drivers: any[] = data?.drivers || [];
  const pagination = data?.pagination;

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Driver Details',
      width: '200px',
      render: (row) => (
        <div>
          <p className="text-sm font-semibold text-[var(--rx-text)]">{row.name}</p>
          <p className="text-xs text-[var(--rx-text-3)]">{row.phone}</p>
        </div>
      ),
    },
    {
      key: 'vehicle',
      header: 'Vehicle Info',
      width: '220px',
      render: (row) => row.make ? (
        <div>
          <p className="text-xs font-semibold text-[var(--rx-text-2)]">{row.make} {row.model} ({row.color})</p>
          <p className="text-[11px] font-mono text-[var(--rx-text-3)] mt-0.5">{row.plate_number} · <span className="uppercase text-[var(--rx-text-4)]">{row.vehicle_type}</span></p>
        </div>
      ) : <span className="text-[var(--rx-text-4)] text-xs">No Vehicle Registered</span>,
    },
    {
      key: 'rating',
      header: 'Rating',
      width: '90px',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
          <svg className="w-3.5 h-3.5 fill-amber-400" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {Number(row.rating || 5).toFixed(1)}
        </span>
      ),
    },
    {
      key: 'total_rides',
      header: 'Total Rides',
      width: '100px',
      render: (row) => <span className="font-semibold text-sm">{row.total_rides ?? 0}</span>,
    },
    {
      key: 'earnings',
      header: 'Earnings',
      width: '110px',
      render: (row) => <span className="font-bold text-sm text-emerald-600">₹{Number(row.earnings || 0).toLocaleString('en-IN')}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => {
        if (!row.is_approved) {
          return <Badge variant="warning">Awaiting Approval</Badge>;
        }
        return row.is_available ? (
          <Badge variant="success">Online & Available</Badge>
        ) : (
          <Badge variant="neutral">Offline</Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '160px',
      render: (row) => {
        const isActioning = actioningId === row.id;
        if (!row.is_approved) {
          return (
            <div className="flex gap-2">
              <button
                disabled={isActioning}
                onClick={() => handleApproval(row.id, true)}
                className="btn-success text-xs px-2.5 h-8 font-semibold flex items-center justify-center"
              >
                Approve
              </button>
              <button
                disabled={isActioning}
                onClick={() => handleApproval(row.id, false)}
                className="btn-danger text-xs px-2.5 h-8 font-semibold flex items-center justify-center"
              >
                Reject
              </button>
            </div>
          );
        }
        return (
          <button
            disabled={isActioning}
            onClick={() => handleApproval(row.id, false)}
            className="btn-danger text-xs px-2.5 h-8 font-semibold flex items-center justify-center"
          >
            Revoke
          </button>
        );
      },
    },
  ];

  const tabs: { label: string; value: ApprovalFilter }[] = [
    { label: 'All Drivers', value: '' },
    { label: 'Pending Review', value: 'pending' },
    { label: 'Approved', value: 'approved' },
  ];

  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-[var(--rx-text)]">Drivers</h2>
          <p className="text-sm text-[var(--rx-text-3)] mt-0.5">
            Manage and approve drivers and vehicle profiles
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3">
        <div className="flex bg-white border border-[var(--rx-border)] rounded-xl p-1 gap-0.5">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => { setFilter(t.value); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === t.value
                  ? 'bg-[var(--rx-blue)] text-white shadow-sm'
                  : 'text-[var(--rx-text-2)] hover:bg-zinc-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={drivers}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        emptyMessage="No drivers found"
      />
    </div>
  );
}
