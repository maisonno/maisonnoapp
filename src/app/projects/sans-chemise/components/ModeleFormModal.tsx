'use client'

import { useState } from 'react'
import type { Modele } from '../lib/types'
import { createModele, updateModele } from '../actions'
import { PRIX_VARIANTE_DEFAUT, sortTailles, TAILLES, VARIANTES } from '../lib/constants'

type Props = {
  modele?: Modele | null
  onClose: () => void
  onDone: () => void
}

export default function ModeleFormModal({ modele, onClose, onDone }: Props) {
  const isEdit = !!modele

  const [nom, setNom] = useState(modele?.nom ?? '')
  // Liste des variantes proposées = prédéfinies + celles déjà sur le modèle
  const [variantesDispo, setVariantesDispo] = useState<string[]>(
    Array.from(new Set([...VARIANTES, ...(modele?.variantes ?? [])])),
  )
  const [variantes, setVariantes] = useState<string[]>(modele?.variantes ?? [])
  const [tailles, setTailles] = useState<string[]>(modele?.tailles ?? [])
  // Prix par variante (en chaîne pour les inputs)
  const [prixVariantes, setPrixVariantes] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const [k, v] of Object.entries(modele?.prixVariantes ?? {})) init[k] = String(v)
    return init
  })
  const [customVariante, setCustomVariante] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleTaille = (value: string) => {
    setTailles((list) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value]))
  }

  // Ajoute/retire une variante ; à l'ajout, pré-remplit son prix (défaut ou existant)
  const toggleVariante = (v: string) => {
    setVariantes((list) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]))
    setPrixVariantes((p) => {
      if (p[v] !== undefined && p[v] !== '') return p
      const def = PRIX_VARIANTE_DEFAUT[v]
      return { ...p, [v]: def != null ? String(def) : '' }
    })
  }

  const setPrice = (v: string, value: string) => setPrixVariantes((p) => ({ ...p, [v]: value }))

  const addCustomVariante = () => {
    const v = customVariante.trim()
    if (!v) return
    if (!variantesDispo.includes(v)) setVariantesDispo((d) => [...d, v])
    if (!variantes.includes(v)) toggleVariante(v)
    setCustomVariante('')
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    const pv: Record<string, number> = {}
    for (const v of variantes) pv[v] = parseFloat(prixVariantes[v] ?? '') || 0
    const payload = { nom, variantes, tailles: sortTailles(tailles), prixVariantes: pv }
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

        <div>
          <label className="text-xs text-slate-400 block mb-1">Nom</label>
          <input
            type="text" value={nom} onChange={(e) => setNom(e.target.value)}
            className="input w-full" placeholder="Ex. Logo classique"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1.5">Variantes</label>
          <div className="flex flex-wrap gap-2">
            {variantesDispo.map((v) => (
              <button
                key={v}
                onClick={() => toggleVariante(v)}
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

        {/* Prix par variante */}
        {variantes.length > 0 && (
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Prix par variante (€)</label>
            <div className="space-y-1.5">
              {variantes.map((v) => (
                <div key={v} className="flex items-center gap-3 bg-slate-800/60 rounded-lg pl-3 pr-2 py-1.5">
                  <span className="flex-1 text-sm text-slate-200 truncate">{v}</span>
                  <input
                    type="number" inputMode="decimal" step="0.01" min="0"
                    value={prixVariantes[v] ?? ''}
                    onChange={(e) => setPrice(v, e.target.value)}
                    className="input w-24 text-right" placeholder="0"
                  />
                  <span className="text-slate-400 text-sm">€</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs text-slate-400 block mb-1.5">Tailles</label>
          <div className="flex flex-wrap gap-2">
            {TAILLES.map((t) => (
              <button
                key={t}
                onClick={() => toggleTaille(t)}
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
