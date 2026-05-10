'use client'

import { useState } from 'react'
import type { Mouvement, TypeOperation } from '../lib/types'
import PoireStats from './PoireStats'
import MouvementList from './MouvementList'
import MouvementFormModal from './MouvementFormModal'

type Props = {
  solde: number
  stats: { mois: string; entrees: number; sorties: number }[]
  mouvements: Mouvement[]
  types: TypeOperation[]
  moisCourant: string
}

export default function PoireDashboard({ solde, stats, mouvements, types, moisCourant }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [mois, setMois] = useState(moisCourant)

  const totalEntrees = mouvements.reduce((a, m) => a + (m.entree ?? 0), 0)
  const totalSorties = mouvements.reduce((a, m) => a + (m.sortie ?? 0), 0)

  return (
    <div className="space-y-6">
      <PoireStats solde={solde} stats={stats} />

      {/* Contrôles mois */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Mois affiché</label>
          <input
            type="month"
            value={mois}
            onChange={(e) => {
              setMois(e.target.value)
              window.location.href = `/projects/scoubidoo-poire?mois=${e.target.value}`
            }}
            className="input"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="shrink-0 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-sm transition-colors"
        >
          + Ajouter
        </button>
      </div>

      {/* Résumé du mois */}
      <div className="flex gap-3">
        <div className="flex-1 bg-emerald-950/40 border border-emerald-800 rounded-xl px-4 py-3 text-center">
          <div className="text-xs text-slate-400 mb-0.5">Entrées</div>
          <div className="text-lg font-bold text-emerald-400">
            +{totalEntrees.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </div>
        </div>
        <div className="flex-1 bg-red-950/40 border border-red-800 rounded-xl px-4 py-3 text-center">
          <div className="text-xs text-slate-400 mb-0.5">Sorties</div>
          <div className="text-lg font-bold text-red-400">
            −{totalSorties.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </div>
        </div>
      </div>

      <MouvementList mouvements={mouvements} types={types} />

      {showModal && (
        <MouvementFormModal types={types} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
