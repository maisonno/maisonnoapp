'use client'

import Link from 'next/link'
import type { CaisseWithCalc } from '../lib/types'

type Props = { services: CaisseWithCalc[] }

function statusBadge(s: CaisseWithCalc) {
  if (s.statut === 'fermee' && Math.abs(s.delta) < 0.01) {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400">✓ Fermée</span>
  }
  if (s.statut === 'fermee' && Math.abs(s.delta) >= 0.01) {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-400">⚠ Δ {s.delta.toFixed(2)} €</span>
  }
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">Brouillon</span>
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatEur(v: number) {
  return v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export default function ServiceList({ services }: Props) {
  if (services.length === 0) {
    return (
      <p className="text-slate-400 text-center py-16">
        Aucun service pour l&apos;instant.{' '}
        <Link href="/projects/scoubidoo-caisse/nouveau" className="text-blue-400 underline">
          Créer le premier
        </Link>
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {services.map((s) => (
        <li key={s.id}>
          <Link
            href={`/projects/scoubidoo-caisse/${s.id}`}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{formatDate(s.date)}</span>
                {s.tag_name && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                    {s.tag_name}
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-400 mt-0.5">
                Full CA : {formatEur(s.full_ca)}
              </div>
            </div>
            <div className="shrink-0">{statusBadge(s)}</div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
