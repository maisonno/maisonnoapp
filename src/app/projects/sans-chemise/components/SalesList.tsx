'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ModeleWithArticles, Vente } from '../lib/types'
import { deleteVente, updateVente } from '../actions'

type Props = {
  ventes: Vente[]
  modeles: ModeleWithArticles[]
}

export default function SalesList({ ventes, modeles }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<Vente | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette vente ?')) return
    setDeleting(id)
    await deleteVente(id)
    setDeleting(null)
    router.refresh()
  }

  const total = ventes.reduce((s, v) => s + v.quantite * v.prix_unitaire, 0)
  const qte = ventes.reduce((s, v) => s + v.quantite, 0)

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center">
          <div className="text-xs text-slate-400">Articles vendus</div>
          <div className="text-lg font-bold text-slate-100">{qte}</div>
        </div>
        <div className="flex-1 bg-emerald-950/40 border border-emerald-800 rounded-xl px-4 py-3 text-center">
          <div className="text-xs text-slate-400">Chiffre d’affaires</div>
          <div className="text-lg font-bold text-emerald-400">
            {total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </div>
        </div>
      </div>

      {ventes.length === 0 ? (
        <p className="text-center text-slate-500 py-10">Aucune vente enregistrée.</p>
      ) : (
        <div className="space-y-2">
          {ventes.map((v) => (
            <div key={v.id} className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-200 truncate">
                  {v.modele_nom} · {v.variante} · {v.taille}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {new Date(v.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {v.notes && <span className="text-slate-600"> · {v.notes}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-base font-semibold text-emerald-400">
                  {(v.quantite * v.prix_unitaire).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </div>
                <div className="text-xs text-slate-500">
                  {v.quantite} × {v.prix_unitaire.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </div>
                <div className="flex gap-2 mt-1 justify-end">
                  <button onClick={() => setEditing(v)} className="text-xs text-slate-500 hover:text-slate-300">Éditer</button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    disabled={deleting === v.id}
                    className="text-xs text-red-500/70 hover:text-red-400 disabled:opacity-50"
                  >
                    Sup.
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <VenteEditModal
          vente={editing}
          modeles={modeles}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); router.refresh() }}
        />
      )}
    </div>
  )
}

function VenteEditModal({
  vente,
  modeles,
  onClose,
  onDone,
}: {
  vente: Vente
  modeles: ModeleWithArticles[]
  onClose: () => void
  onDone: () => void
}) {
  // Retrouve le modèle de la vente courante à partir de l'article
  const initialModele = modeles.find((m) => m.articles.some((a) => a.id === vente.article_id)) ?? modeles[0] ?? null

  const [modeleId, setModeleId] = useState(initialModele?.id ?? '')
  const [variante, setVariante] = useState(vente.variante)
  const [articleId, setArticleId] = useState(vente.article_id)
  const [quantite, setQuantite] = useState(vente.quantite)
  const [prix, setPrix] = useState(String(vente.prix_unitaire))
  const [date, setDate] = useState(vente.date)
  const [notes, setNotes] = useState(vente.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const modele = modeles.find((m) => m.id === modeleId)
  const variantes = useMemo(() => {
    if (!modele) return [] as string[]
    const set = new Set(modele.articles.map((a) => a.variante))
    return modele.variantes.filter((v) => set.has(v))
  }, [modele])
  const tailles = useMemo(
    () => modele?.articles.filter((a) => a.variante === variante) ?? [],
    [modele, variante],
  )

  const handleModele = (id: string) => {
    setModeleId(id)
    const m = modeles.find((x) => x.id === id)
    const firstVar = m?.variantes.find((v) => m.articles.some((a) => a.variante === v)) ?? ''
    setVariante(firstVar)
    setArticleId(m?.articles.find((a) => a.variante === firstVar)?.id ?? '')
  }
  const handleVariante = (v: string) => {
    setVariante(v)
    setArticleId(modele?.articles.find((a) => a.variante === v)?.id ?? '')
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    const result = await updateVente(vente.id, {
      date,
      article_id: articleId,
      quantite,
      prix_unitaire: prix,
      notes,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl p-5 pb-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Modifier la vente</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">×</button>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Modèle</label>
          <select value={modeleId} onChange={(e) => handleModele(e.target.value)} className="input w-full">
            {modeles.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-slate-400 block mb-1">Variante</label>
            <select value={variante} onChange={(e) => handleVariante(e.target.value)} className="input w-full">
              {variantes.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="w-28">
            <label className="text-xs text-slate-400 block mb-1">Taille</label>
            <select value={articleId} onChange={(e) => setArticleId(e.target.value)} className="input w-full">
              {tailles.map((a) => <option key={a.id} value={a.id}>{a.taille}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-slate-400 block mb-1">Quantité</label>
            <input
              type="number" inputMode="numeric" min={1} value={quantite}
              onChange={(e) => setQuantite(Math.max(1, Math.round(Number(e.target.value) || 1)))}
              className="input w-full text-center"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-400 block mb-1">Prix unit. (€)</label>
            <input
              type="number" inputMode="decimal" step="0.01" min="0" value={prix}
              onChange={(e) => setPrix(e.target.value)} className="input w-full text-right"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-full" />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Notes</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="input w-full" placeholder="Optionnel" />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
