import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { DataTable } from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import { Badge, roleBadge } from '../components/ui/Badge';

type RoleFilter = '' | 'RIDER' | 'DRIVER' | 'ADMIN';

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-[var(--rx-blue-dim)] flex items-center justify-center text-[var(--rx-blue)] font-bold text-xs flex-shrink-0">
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<RoleFilter>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [blockingId, setBlockingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, role, search],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 15 };
      if (role) params.role = role;
      if (search) params.search = search;
      const res = await api.get('/admin/users', { params });
      return res.data.data;
    },
    keepPreviousData: true,
  });

  const blockMutation = useMutation({
    mutationFn: async ({ userId, blocked }: { userId: string; blocked: boolean }) => {
      await api.patch(`/admin/users/${userId}/block`, { blocked });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setBlockingId(null);
    },
    onError: () => setBlockingId(null),
  });

  const handleBlock = (userId: string, currentBlocked: boolean) => {
    setBlockingId(userId);
    blockMutation.mutate({ userId, blocked: !currentBlocked });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const users: any[] = data?.users || [];
  const pagination = data?.pagination;

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'User',
      width: '200px',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.name} />
          <div>
            <p className="text-sm font-semibold text-[var(--rx-text)]">{row.name}</p>
            <p className="text-xs text-[var(--rx-text-3)]">{row.email || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      width: '130px',
      render: (row) => <span className="font-mono text-sm">{row.phone}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      width: '100px',
      render: (row) => <Badge variant={roleBadge(row.role)}>{row.role}</Badge>,
    },
    {
      key: 'total_rides',
      header: 'Rides',
      width: '80px',
      render: (row) => (
        <span className="font-semibold text-[var(--rx-text)]">
          {row.total_rides ?? 0}
        </span>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      width: '80px',
      render: (row) => row.rating ? (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
          <svg className="w-3 h-3 fill-amber-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          {Number(row.rating).toFixed(1)}
        </span>
      ) : <span className="text-[var(--rx-text-4)]">—</span>,
    },
    {
      key: 'is_approved',
      header: 'Approved',
      width: '100px',
      render: (row) => row.role !== 'DRIVER' ? <span className="text-[var(--rx-text-4)] text-xs">N/A</span> :
        row.is_approved
          ? <Badge variant="success">Approved</Badge>
          : <Badge variant="warning">Pending</Badge>,
    },
    {
      key: 'created_at',
      header: 'Joined',
      width: '110px',
      render: (row) => (
        <span className="text-xs text-[var(--rx-text-3)]">
          {new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '110px',
      render: (row) => (
        <button
          disabled={blockingId === row.id}
          onClick={() => handleBlock(row.id, !!row.is_blocked)}
          className={row.is_blocked ? 'btn-success' : 'btn-danger'}
          style={{ fontSize: 12, height: 30, padding: '0 10px' }}
        >
          {blockingId === row.id
            ? '…'
            : row.is_blocked ? 'Unblock' : 'Block'}
        </button>
      ),
    },
  ];

  const tabs: { label: string; value: RoleFilter }[] = [
    { label: 'All Users', value: '' },
    { label: 'Riders', value: 'RIDER' },
    { label: 'Drivers', value: 'DRIVER' },
    { label: 'Admins', value: 'ADMIN' },
  ];

  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-[var(--rx-text)]">Users</h2>
          <p className="text-sm text-[var(--rx-text-3)] mt-0.5">
            {pagination?.total ?? '—'} registered accounts
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        {/* Tabs */}
        <div className="flex bg-white border border-[var(--rx-border)] rounded-xl p-1 gap-0.5">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => { setRole(t.value); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                role === t.value
                  ? 'bg-[var(--rx-blue)] text-white shadow-sm'
                  : 'text-[var(--rx-text-2)] hover:bg-zinc-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-72 flex gap-2">
          <input
            type="text"
            placeholder="Search name, phone, email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="glass-input"
            style={{ height: 36, fontSize: 13 }}
          />
          <button type="submit" className="btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>Search</button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
              className="btn-ghost"
              style={{ height: 36, padding: '0 12px', fontSize: 13 }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        emptyMessage="No users found"
      />
    </div>
  );
}
