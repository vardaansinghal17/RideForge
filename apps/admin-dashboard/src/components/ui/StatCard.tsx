import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'orange' | 'green' | 'red' | 'amber' | 'purple' | 'blue';
  trend?: { value: string; up: boolean };
}

const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
  orange: { bg: 'rgba(255,90,31,0.08)', icon: '#FF5A1F', text: 'text-orange-600' },
  green:  { bg: 'rgba(16,185,129,0.08)', icon: '#10B981', text: 'text-emerald-600' },
  red:    { bg: 'rgba(239,68,68,0.08)', icon: '#EF4444', text: 'text-red-600' },
  amber:  { bg: 'rgba(245,158,11,0.08)', icon: '#F59E0B', text: 'text-amber-600' },
  purple: { bg: 'rgba(139,92,246,0.08)', icon: '#8B5CF6', text: 'text-purple-600' },
  blue:   { bg: 'rgba(59,130,246,0.08)', icon: '#3B82F6', text: 'text-blue-600' },
};

export const StatCard: React.FC<StatCardProps> = ({
  title, value, subtitle, icon, color = 'orange', trend
}) => {
  const c = colorMap[color];
  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: c.bg, color: c.icon }}
        >
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend.up ? 'text-emerald-600' : 'text-red-500'}`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              {trend.up
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              }
            </svg>
            {trend.value}
          </span>
        )}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--rx-text-3)]">{title}</p>
        <p className="text-3xl font-black text-[var(--rx-text)] mt-0.5 leading-none">{value}</p>
        {subtitle && <p className="text-xs text-[var(--rx-text-3)] mt-1.5 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
};
