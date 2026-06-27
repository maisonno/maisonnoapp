'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Article, ModeleWithArticles } from '../lib/types'
import { createVente } from '../actions'

type Props = {
  modeles: ModeleWithArticles[]
}

export default function SaleEntry({ modeles }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<ModeleWithArticles | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const handleDone = (label: string) => {
    setSelected(null)
    setToast(label)
    router.refresh()
    setTimeout(() => setToast(null), 1800)
  }

  if (modeles.length === 0) {
    return (
      <p className="text-center text-slate-500 py-12">
        Aucun modèle actif. Crée-en un dans l’onglet <span className="text-slate-300">Modèles</span>.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">Touche un modèle pour enregistrer une vente.</p>

      <div className="grid grid-cols-2 gap-3">
        {modeles.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelected(m)}
            className="text-left bg-slate-900 border border-slate-800 hover:border-blue-600 active:bg-slate-800 rounded-2xl p-4 transition-colors"
          >
            <div className="font-semibold text-slate-100 leading-tight">{m.nom}</div>
            <div className="text-blue-400 text-sm font-medium mt-1">
              {m.prix.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Stock : <span className={m.stockTotal <= 0 ? 'text-red-400' : 'text-slate-300'}>{m.stockTotal}</span>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <SaleSheet modele={selected} onClose={() => setSelected(null)} onDone={handleDone} />
      )}

      {toast && (
        <div className="fixed bottom-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}

function SaleSheet({
  modele,
  onClose,
  onDone,
}: {
  modele: ModeleWithArticles
  onClose: () => void
  onDone: (label: string) => void
}) {
  const today = new Date().toISOString().split('T')[0]

  // Variantes réellement disponibles (ayant au moins un article actif)
  const variantes = useMemo(() => {
    const set = new Set(modele.articles.map((a) => a.variante))
    return modele.variantes.filter((v) => set.has(v))
  }, [modele])

  const [variante, setVariante] = useState(variantes[0] ?? '')
  const [article, setArticle] = useState<Article | null>(null)
  const [quantite, setQuantite] = useState(1)
  const [prix, setPrix] = useState(String(modele.prix))
  const [date, setDate] = useState(today)
  const [showDate, setShowDate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tailles = useMemo(
    () => modele.articles.filter((a) => a.variante === variante),
    [modele, variante],
  )

  const handleVariante = (v: string) => {
    setVariante(v)
    setArticle(null)
  }

  const handleSubmit = async () => {
    if (!article) { setError('Choisis une taille'); return }
    setSaving(true)
    setError(null)
    const result = await createVente({
      date,
      article_id: article.id,
      quantite,
      prix_unitaire: prix,
      notes: '',
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    onDone(`${modele.nom} ${article.taille} ✓`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl p-5 pb-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold">{modele.nom}</h2>
            <p className="text-xs text-slate-500">Nouvelle vente</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">×</button>
        </div>

        {/* Variante (masquée si une seule) */}
        {variantes.length > 1 && (
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Variante</label>
            <div className="flex flex-wrap gap-2">
              {variantes.map((v) => (
                <button
                  key={v}
                  onClick={() => handleVariante(v)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    variante === v ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tailles avec stock */}
        <div>
          <label className="text-xs text-slate-400 block mb-1.5">Taille</label>
          <div className="grid grid-cols-4 gap-2">
            {tailles.map((a) => {
              const active = article?.id === a.id
              return (
                <button
                  key={a.id}
                  onClick={() => { setArticle(a); setError(null) }}
                  className={`flex flex-col items-center py-2 rounded-xl border text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-200'
                  }`}
                >
                  {a.taille}
                  <span className={`text-[10px] font-normal mt-0.5 ${a.stock <= 0 ? 'text-red-400' : active ? 'text-blue-100' : 'text-slate-500'}`}>
                    {a.stock} en stock
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Quantité + prix sur une ligne */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-slate-400 block mb-1.5">Quantité</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantite((q) => Math.max(1, q - 1))}
                className="w-10 h-11 rounded-xl bg-slate-800 text-xl font-bold text-slate-300 active:bg-slate-700"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={quantite}
                onChange={(e) => setQuantite(Math.max(1, Math.round(Number(e.target.value) || 1)))}
                className="input flex-1 text-center font-semibold"
              />
              <button
                onClick={() => setQuantite((q) => q + 1)}
                className="w-10 h-11 rounded-xl bg-slate-800 text-xl font-bold text-slate-300 active:bg-slate-700"
              >
                +
              </button>
            </div>
          </div>
          <div className="w-28">
            <label className="text-xs text-slate-400 block mb-1.5">Prix unit.</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={prix}
                onChange={(e) => setPrix(e.target.value)}
                className="input text-right"
              />
              <span className="text-slate-400 text-sm">€</span>
            </div>
          </div>
        </div>

        {/* Date repliée par défaut (vente du jour) */}
        {showDate ? (
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-full" />
          </div>
        ) : (
          <button onClick={() => setShowDate(true)} className="text-xs text-slate-500 hover:text-slate-300">
            Aujourd’hui · changer la date
          </button>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving || !article}
          className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-base transition-colors disabled:opacity-40"
        >
          {saving
            ? 'Enregistrement…'
            : `Valider la vente${article ? ` · ${(quantite * (parseFloat(prix) || 0)).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}` : ''}`}
        </button>
      </div>
    </div>
  )
}
