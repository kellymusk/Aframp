interface StatCardProps {
  label: string
  value: string
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-panel border-hairline rounded-2xl border p-5">
      <p className="text-dim text-xs">{label}</p>
      <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">{value}</p>
    </div>
  )
}
