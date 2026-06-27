'use client'

import { useState } from 'react'
import type { Modele } from '../lib/types'
import { createModele, updateModele } from '../actions'
import { sortTailles, TAILLES, VARIANTES } from '../lib/constants'

type Props = {
  modele?: Modele | null
  onClose: () => void
  onDone: () => void
}

export default function ModeleFormModal({ modele, onClose, onDone }: Props) {
  const isEdit = !!modele

  const [nom, setNom] = useState(modele?.nom ?? '')
  const [prix, setPrix] = useState(modele ? String(modele.prix) : '')
  // Liste des variantes proposées = prédéfinies + celles déjà sur le modèle
  const [variantesDispo, setVariantesDispo] = useState<string[]>(
    Array.from(new Set([...VARIANTES, ...(modele?.variantes ?? [])])),
  )
  const [variantes, setVariantes] = useState<string[]>(modele?.variantes ?? [])
  const [tailles, setTailles] = useState<string[]>(modele?.tailles ?? [])
  const [customVariante, setCustomVariante] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (list: string[], set: (v: string[]) => void, value: string) => {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])
  }

  const addCustomVariante = () => {
    const v = customVariante.trim()
    if (!v) return
    if (!variantesDispo.includes(v)) setVariantesDispo((d) => [...d, v])
    if (!variantes.includes(v)) setVariantes((s) => [...s, v])
    setCustomVariante('')
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    const payload = { nom, prix, variantes, tailles: sortTailles(tailles) }
    const result = isEdit ? await updateModele(modele.id, payload) : await createModele(payload)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl p-5 pb-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">{isEdit ? 'Modifier le modèle' : 'Nouveau modèle'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">×</button>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-slate-400 block mb-1">Nom</label>
            <input
              type="text" value={nom} onChange={(e) => setNom(e.target.value)}
              className="input w-full" placeholder="Ex. Logo classique"
            />
          </div>
          <div className="w-28">
            <label className="text-xs text-slate-400 block mb-1">Prix (€)</label>
            <input
              type="number" inputMode="decimal" step="0.01" min="0" value={prix}
              onChange={(e) => setPrix(e.target.value)} className="input w-full text-right" placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1.5">Variantes</label>
          <div className="flex flex-wrap gap-2">
            {variantesDispo.map((v) => (
              <button
                key={v}
                onClick={() => toggle(variantes, setVariantes, v)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  variantes.includes(v) ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text" value={customVariante} onChange={(e) => setCustomVariante(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomVariante() } }}
              className="input flex-1" placeholder="Autre variante…"
            />
            <button onClick={addCustomVariante} className="px-4 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium">
              Ajouter
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1.5">Tailles</label>
          <div className="flex flex-wrap gap-2">
            {TAILLES.map((t) => (
              <button
                key={t}
                onClick={() => toggle(tailles, setTailles, t)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  tailles.includes(t) ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {isEdit && (
          <p className="text-xs text-slate-500">
            Retirer une variante/taille désactive ses articles sans effacer l’historique des ventes.
          </p>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le modèle'}
        </button>
      </div>
    </div>
  )
}
