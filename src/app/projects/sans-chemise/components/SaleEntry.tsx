'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Article } from '../lib/types'
import { createVente } from '../actions'

type ArticleRow = Article & { modele_nom: string }

type Props = {
  articles: ArticleRow[]
}

const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export default function SaleEntry({ articles }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selected, setSelected] = useState<ArticleRow | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  // Décrément optimiste du stock après une vente rapide
  const [optimistic, setOptimistic] = useState<Record<string, number>>({})
  useEffect(() => { setOptimistic({}) }, [articles])

  const stockOf = useCallback((a: ArticleRow) => optimistic[a.id] ?? a.stock, [optimistic])

  // Types (variantes) présents parmi les articles vendables
  const types = useMemo(
    () => Array.from(new Set(articles.filter((a) => stockOf(a) > 0).map((a) => a.variante)))
      .sort((a, b) => a.localeCompare(b, 'fr')),
    [articles, stockOf],
  )

  // En stock uniquement, filtré, trié par stock décroissant (phares en cas d'égalité)
  const rows = useMemo(() => {
    const q = norm(search.trim())
    return articles
      .filter((a) => stockOf(a) > 0)
      .filter((a) => typeFilter === 'all' || a.variante === typeFilter)
      .filter((a) => !q || norm(`${a.modele_nom} ${a.variante} ${a.taille}`).includes(q))
      .sort((a, b) => {
        const d = stockOf(b) - stockOf(a)
        if (d !== 0) return d
        if (a.phare !== b.phare) return a.phare ? -1 : 1
        return a.modele_nom.localeCompare(b.modele_nom, 'fr')
      })
  }, [articles, stockOf, search, typeFilter])

  const showToast = (label: string) => {
    setToast(label)
    setTimeout(() => setToast(null), 1800)
  }

  // Vente rapide : 1 article, CB, prix nominal
  const quickSale = async (a: ArticleRow) => {
    setSaving(a.id)
    setOptimistic((o) => ({ ...o, [a.id]: stockOf(a) - 1 }))
    const res = await createVente({
      date: new Date().toISOString().split('T')[0],
      article_id: a.id,
      quantite: 1,
      prix_unitaire: String(a.prix ?? 0),
      mode_paiement: 'cb',
      notes: '',
    })
    setSaving(null)
    if (res.error) {
      setOptimistic((o) => ({ ...o, [a.id]: (o[a.id] ?? a.stock) + 1 }))
      alert(res.error)
      return
    }
    showToast(`${a.modele_nom} · ${a.taille} ✓`)
    router.refresh()
  }

  const sellable = articles.some((a) => stockOf(a) > 0)

  return (
    <div className="space-y-3">
      {/* Recherche + filtre par type */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un modèle, une taille…"
            className="input w-full pl-9"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">⌕</span>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input w-auto shrink-0"
          aria-label="Filtrer par type"
        >
          <option value="all">Tous types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {!sellable ? (
        <p className="text-center text-slate-500 py-12">
          Aucun article en stock. Réceptionne du stock dans l’onglet{' '}
          <span className="text-slate-300">Stock</span>.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-center text-slate-500 py-8">Aucun article ne correspond.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((a) => {
            const stock = stockOf(a)
            const prix = a.prix ?? 0
            return (
              <div
                key={a.id}
                className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl pl-4 pr-2 py-1.5"
              >
                <button
                  onClick={() => setSelected(a)}
                  className="flex-1 min-w-0 text-left py-1"
                  title="Options (quantité, espèces, prix…)"
                >
                  <div className="text-sm text-slate-200 truncate">
                    {a.phare && <span className="text-amber-400">★ </span>}
                    {a.modele_nom}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {a.variante} · {a.taille} · <span className="text-blue-400">{eur(prix)}</span>
                  </div>
                </button>
                <span className={`w-7 text-center text-sm font-bold tabular-nums ${
                  stock <= 3 ? 'text-amber-400' : 'text-slate-100'
                }`}>
                  {stock}
                </span>
                <button
                  onClick={() => quickSale(a)}
                  disabled={saving === a.id}
                  className="shrink-0 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  Vente
                </button>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <ArticleSaleSheet
          article={selected}
          onClose={() => setSelected(null)}
          onDone={(label) => {
            setSelected(null)
            showToast(label)
            router.refresh()
          }}
        />
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

// Feuille détaillée pour une vente sur un article précis (quantité, prix, paiement, date)
function ArticleSaleSheet({
  article,
  onClose,
  onDone,
}: {
  article: ArticleRow
  onClose: () => void
  onDone: (label: string) => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [quantite, setQuantite] = useState(1)
  const [prix, setPrix] = useState(String(article.prix ?? 0))
  const [mode, setMode] = useState<'cb' | 'especes'>('cb')
  const [date, setDate] = useState(today)
  const [showDate, setShowDate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    const result = await createVente({
      date,
      article_id: article.id,
      quantite,
      prix_unitaire: prix,
      mode_paiement: mode,
      notes: '',
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    onDone(`${article.modele_nom} · ${article.taille} ✓`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl p-5 pb-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate">{article.modele_nom}</h2>
            <p className="text-xs text-slate-500">{article.variante} · {article.taille} · stock {article.stock}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none shrink-0">×</button>
        </div>

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
                type="number" inputMode="numeric" min={1} value={quantite}
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
                type="number" inputMode="decimal" step="0.01" min="0" value={prix}
                onChange={(e) => setPrix(e.target.value)}
                className="input text-right"
              />
              <span className="text-slate-400 text-sm">€</span>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1.5">Paiement</label>
          <div className="flex gap-3">
            <button
              type="button" onClick={() => setMode('cb')}
              className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                mode === 'cb' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              💳 CB
            </button>
            <button
              type="button" onClick={() => setMode('especes')}
              className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                mode === 'especes' ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              💶 Espèces
            </button>
          </div>
        </div>

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
          disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-base transition-colors disabled:opacity-50"
        >
          {saving
            ? 'Enregistrement…'
            : `Valider la vente · ${eur(quantite * (parseFloat(prix) || 0))}`}
        </button>
      </div>
    </div>
  )
}
