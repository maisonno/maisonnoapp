type Props = {
  delta: number
  statut: string
}

export default function DeltaBadge({ delta, statut }: Props) {
  if (statut === 'brouillon') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-400">
        Brouillon
      </span>
    )
  }

  const ok = Math.abs(delta) < 0.01
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      ok ? 'bg-emerald-900/50 text-emerald-400' : 'bg-amber-900/50 text-amber-400'
    }`}>
      {ok ? 'Fermée' : `Δ ${delta >= 0 ? '+' : ''}${delta.toFixed(2)} €`}
    </span>
  )
}
