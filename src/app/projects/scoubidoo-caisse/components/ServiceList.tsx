'use client'

import { useState } from 'react'
import Link from 'next/link'
import { deleteCaisse } from '../actions'
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
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('Supprimer ce service ?')) return
    setDeletingId(id)
    await deleteCaisse(id)
    setDeletingId(null)
  }

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
        <li key={s.id} className="relative">
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
            <div className="shrink-0 flex items-center gap-2">
              {statusBadge(s)}
              <button
                onClick={(e) => handleDelete(e, s.id)}
                disabled={deletingId === s.id}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-colors disabled:opacity-40"
                aria-label="Supprimer"
              >
                {deletingId === s.id ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
