// src/components/ProbabilityChart.jsx
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const isClient = typeof window !== 'undefined';

const ProbabilityChart = ({ recommendations, bUsed, cUsed }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isClient) setIsMounted(true);
  }, []);

  if (!isMounted) return <div style={{ height: '200px' }}></div>;

  const data = [
    { name: 'A', prob: recommendations.A },
    { name: 'B', prob: bUsed < 3 ? recommendations.B : 0 },
    { name: 'C', prob: cUsed < 3 ? recommendations.C : 0 },
  ];

  return (
    <div style={{ height: '200px', marginTop: '20px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 14, fill: '#4b5563' }} />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 14, fill: '#4b5563' }}
          />
          <Tooltip
            formatter={(value) => [`${(value * 100).toFixed(1)}%`, '성공 확률']}
            contentStyle={{
              backgroundColor: '#1e293b',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px'
            }}
            itemStyle={{ color: 'white' }}
          />
          <Bar
            dataKey="prob"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProbabilityChart;