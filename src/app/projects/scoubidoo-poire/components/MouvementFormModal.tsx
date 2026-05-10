'use client'

import { useState } from 'react'
import type { Mouvement, TypeOperation } from '../lib/types'
import { createMouvement, updateMouvement } from '../actions'

type Props = {
  mouvement?: Mouvement | null
  types: TypeOperation[]
  onClose: () => void
}

export default function MouvementFormModal({ mouvement, types, onClose }: Props) {
  const isEdit = !!mouvement
  const today = new Date().toISOString().split('T')[0]

  const initSens = (): 'entree' | 'sortie' => {
    if (!mouvement) return 'sortie'
    return mouvement.entree != null && mouvement.entree > 0 ? 'entree' : 'sortie'
  }

  const [date, setDate] = useState(mouvement?.date ?? today)
  const [typeId, setTypeId] = useState(mouvement?.type_operation_id ?? '')
  const [sens, setSens] = useState<'entree' | 'sortie'>(initSens())
  const [montant, setMontant] = useState(
    mouvement ? String(mouvement.entree ?? mouvement.sortie ?? '') : ''
  )
  const [notes, setNotes] = useState(mouvement?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = { date, type_operation_id: typeId, montant, sens, notes }
    const result = isEdit
      ? await updateMouvement(mouvement.id, payload)
      : await createMouvement(payload)

    setSaving(false)
    if (result.error) { setError(result.error); return }
    onClose()
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5 shadow-2xl">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">{isEdit ? 'Modifier' : 'Nouveau mouvement'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="input w-full"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1">Type</label>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="input w-full"
            >
              <option value="">—</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-2">Sens</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSens('entree')}
                className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                  sens === 'entree' ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Entrée
              </button>
              <button
                type="button"
                onClick={() => setSens('sortie')}
                className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                  sens === 'sortie' ? 'bg-red-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Sortie
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1">Montant</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                required
                className="input flex-1 text-right"
                placeholder="0,00"
              />
              <span className="text-slate-400 text-sm">€</span>
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full"
              placeholder="Optionnel"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : isEdit ? 'Modifier' : 'Ajouter'}
          </button>
        </form>
      </div>
    </div>
  )
}
