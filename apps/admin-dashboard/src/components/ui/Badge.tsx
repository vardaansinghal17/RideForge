import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple';
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  error:   'bg-red-50 text-red-700 border border-red-200',
  info:    'bg-orange-50 text-orange-700 border border-orange-200',
  neutral: 'bg-zinc-100 text-zinc-600 border border-zinc-200',
  purple:  'bg-purple-50 text-purple-700 border border-purple-200',
};

const dotStyles: Record<string, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error:   'bg-red-500',
  info:    'bg-orange-500',
  neutral: 'bg-zinc-400',
  purple:  'bg-purple-500',
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, className = '' }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${variantStyles[variant]} ${className}`}>
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotStyles[variant]}`} />
    {children}
  </span>
);

// Helper maps for ride/payment statuses
export function rideStatusBadge(status: string) {
  const map: Record<string, BadgeProps['variant']> = {
    REQUESTED:   'warning',
    ACCEPTED:    'info',
    ARRIVED:     'purple',
    IN_PROGRESS: 'info',
    COMPLETED:   'success',
    CANCELLED:   'error',
  };
  return map[status] ?? 'neutral';
}

export function paymentStatusBadge(status: string) {
  const map: Record<string, BadgeProps['variant']> = {
    PENDING:   'warning',
    COMPLETED: 'success',
    FAILED:    'error',
  };
  return map[status] ?? 'neutral';
}

export function roleBadge(role: string) {
  const map: Record<string, BadgeProps['variant']> = {
    RIDER:  'info',
    DRIVER: 'purple',
    ADMIN:  'error',
  };
  return map[role] ?? 'neutral';
}

export function methodBadge(method: string) {
  const map: Record<string, BadgeProps['variant']> = {
    CASH: 'success',
    CARD: 'info',
    UPI:  'purple',
  };
  return map[method] ?? 'neutral';
}

export const paymentMethodBadge = methodBadge;
