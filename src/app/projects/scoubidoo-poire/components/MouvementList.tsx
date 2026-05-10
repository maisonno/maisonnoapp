'use client'

import { useState } from 'react'
import type { Mouvement, TypeOperation } from '../lib/types'
import { deleteMouvement } from '../actions'
import MouvementFormModal from './MouvementFormModal'

type Props = {
  mouvements: Mouvement[]
  types: TypeOperation[]
}

export default function MouvementList({ mouvements, types }: Props) {
  const [editing, setEditing] = useState<Mouvement | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce mouvement ?')) return
    setDeleting(id)
    await deleteMouvement(id)
    setDeleting(null)
    window.location.reload()
  }

  if (mouvements.length === 0) {
    return <p className="text-center text-slate-500 py-8">Aucun mouvement ce mois-ci.</p>
  }

  return (
    <>
      <div className="space-y-2">
        {mouvements.map((m) => {
          const isEntree = m.entree != null && m.entree > 0
          const montant = isEntree ? m.entree! : m.sortie!
          const isAuto = m.caisse_id != null

          return (
            <div
              key={m.id}
              className="flex items-start gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3"
            >
              <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${isEntree ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-200 truncate">
                      {m.type_operation_name ?? '—'}
                      {isAuto && <span className="ml-2 text-xs text-slate-500">(auto)</span>}
                    </div>
                    {m.notes && <div className="text-xs text-slate-500 truncate">{m.notes}</div>}
                    <div className="text-xs text-slate-600 mt-0.5">
                      {new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-base font-semibold ${isEntree ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isEntree ? '+' : '−'}{montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                    {!isAuto && (
                      <div className="flex gap-2 mt-1 justify-end">
                        <button
                          onClick={() => setEditing(m)}
                          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          Éditer
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={deleting === m.id}
                          className="text-xs text-red-500/70 hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          Sup.
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {editing && (
        <MouvementFormModal
          mouvement={editing}
          types={types}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
