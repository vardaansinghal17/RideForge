import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

interface DataPoint {
  period?: string;
  day?: string;
  revenue: number;
  rides: number;
}

interface RevenueChartProps {
  data: DataPoint[];
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-strong px-4 py-3 text-sm shadow-xl">
      <p className="font-semibold text-[var(--rx-text)] mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span className="text-[var(--rx-text-2)]">
            {entry.dataKey === 'revenue' ? `₹${Number(entry.value).toLocaleString('en-IN')}` : `${entry.value} rides`}
          </span>
        </div>
      ))}
    </div>
  );
};

export const RevenueChart: React.FC<RevenueChartProps> = ({ data, height = 260 }) => {
  const chartData = data.map((d) => ({
    ...d,
    label: d.period || d.day || '',
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF5A1F" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#FF5A1F" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradRides" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(9,9,11,0.06)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#71717a' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#71717a' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
          yAxisId="revenue"
        />
        <YAxis
          orientation="right"
          tick={{ fontSize: 10, fill: '#71717a' }}
          tickLine={false}
          axisLine={false}
          yAxisId="rides"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#71717a', paddingTop: 12 }}
          formatter={(value) => value === 'revenue' ? 'Revenue (₹)' : 'Rides'}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          yAxisId="revenue"
          stroke="#FF5A1F"
          strokeWidth={2}
          fill="url(#gradRevenue)"
          dot={false}
          activeDot={{ r: 5, fill: '#FF5A1F', stroke: '#fff', strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="rides"
          yAxisId="rides"
          stroke="#10B981"
          strokeWidth={2}
          fill="url(#gradRides)"
          dot={false}
          activeDot={{ r: 5, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
