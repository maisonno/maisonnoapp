'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Modele } from '../lib/types'
import { deleteModele, setModeleActif } from '../actions'
import ModeleFormModal from './ModeleFormModal'

type Props = {
  modeles: Modele[]
}

export default function ModelesView({ modeles }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Modele | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const handleToggle = async (m: Modele) => {
    setBusy(m.id)
    await setModeleActif(m.id, !m.actif)
    setBusy(null)
    router.refresh()
  }

  const handleDelete = async (m: Modele) => {
    if (!confirm(`Supprimer le modèle « ${m.nom} » ?`)) return
    setBusy(m.id)
    const res = await deleteModele(m.id)
    setBusy(null)
    if (res.error) { alert(res.error); return }
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => { setEditing(null); setShowForm(true) }}
        className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 font-semibold transition-colors"
      >
        + Nouveau modèle
      </button>

      {modeles.length === 0 ? (
        <p className="text-center text-slate-500 py-10">Aucun modèle.</p>
      ) : (
        <div className="space-y-2">
          {modeles.map((m) => (
            <div
              key={m.id}
              className={`bg-slate-900 border rounded-xl px-4 py-3 ${m.actif ? 'border-slate-800' : 'border-slate-800/60 opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-100">
                    {m.nom}
                    {!m.actif && <span className="ml-2 text-xs text-slate-500">(inactif)</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                    {m.variantes.map((v) => (
                      <span key={v} className="text-xs text-slate-400">
                        {v}{' '}
                        <span className="text-blue-400 font-medium">
                          {(m.prixVariantes[v] ?? m.prix).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">Tailles : {m.tailles.join(', ')}</div>
                </div>
              </div>
              <div className="flex gap-3 mt-2 pt-2 border-t border-slate-800/70">
                <button onClick={() => { setEditing(m); setShowForm(true) }} className="text-xs text-slate-400 hover:text-slate-200">
                  Éditer
                </button>
                <button onClick={() => handleToggle(m)} disabled={busy === m.id} className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50">
                  {m.actif ? 'Désactiver' : 'Réactiver'}
                </button>
                <button onClick={() => handleDelete(m)} disabled={busy === m.id} className="text-xs text-red-500/70 hover:text-red-400 disabled:opacity-50 ml-auto">
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ModeleFormModal
          modele={editing}
          onClose={() => setShowForm(false)}
          onDone={() => { setShowForm(false); router.refresh() }}
        />
      )}
    </div>
  )
}
