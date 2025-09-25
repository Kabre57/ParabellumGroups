import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface InterventionChartProps {
  data: Array<{
    month: string;
    interventions: number;
  }>;
}

export default function InterventionChart({ data }: InterventionChartProps) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
          <XAxis 
            dataKey="month" 
            className="text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12, fill: 'currentColor' }}
            stroke="currentColor"
          />
          <YAxis 
            className="text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12, fill: 'currentColor' }}
            stroke="currentColor"
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg)',
              border: '1px solid var(--tooltip-border)',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              color: 'var(--tooltip-text)'
            }}
            labelStyle={{ color: 'var(--tooltip-text)' }}
          />
          <Line 
            type="monotone" 
            dataKey="interventions" 
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
            activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
          />
        </LineChart>
      </ResponsiveContainer>
      
      <style>{`
        :root {
          --tooltip-bg: #ffffff;
          --tooltip-border: #e5e7eb;
          --tooltip-text: #111827;
        }
        .dark {
          --tooltip-bg: #374151;
          --tooltip-border: #4b5563;
          --tooltip-text: #f9fafb;
        }
      `}</style>
    </div>
  );
}