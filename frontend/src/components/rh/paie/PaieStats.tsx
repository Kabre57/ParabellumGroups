import { RhStatCard } from '@/types/rh';

export function PaieStats({ stats }: { stats: RhStatCard[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          <p className="text-lg font-semibold">{stat.value}</p>
          {stat.hint ? <p className="text-xs text-muted-foreground">{stat.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}
