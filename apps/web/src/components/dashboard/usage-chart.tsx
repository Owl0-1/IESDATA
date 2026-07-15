'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Point = { date: string; count: number };

function formatDay(iso: string) {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

export function UsageChart({ series }: { series: Point[] }) {
  const chartData = series.map((p) => ({
    ...p,
    label: formatDay(p.date),
  }));

  return (
    <div className="mt-4 h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#a8a29e', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            allowDecimals={false}
            width={36}
            tick={{ fill: '#a8a29e', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(52,211,153,0.35)' }}
            contentStyle={{
              background: '#12201b',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              fontSize: 12,
              color: '#f5f5f4',
            }}
            labelFormatter={(_, payload) => {
              const date = payload?.[0]?.payload?.date as string | undefined;
              return date ?? '';
            }}
            formatter={(value) => [
              Number(value).toLocaleString('pt-BR'),
              'Requests',
            ]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#34d399"
            strokeWidth={2}
            fill="url(#usageFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
