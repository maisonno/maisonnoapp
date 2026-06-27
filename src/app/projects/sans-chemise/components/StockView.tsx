'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Article, Mouvement } from '../lib/types'
import { createMouvement, deleteMouvement } from '../actions'

type ArticleRow = Article & { modele_nom: string }

type Props = {
  articles: ArticleRow[]
  mouvements: Mouvement[]
}

export default function StockView({ articles, mouvements }: Props) {
  const router = useRouter()
  const [target, setTarget] = useState<ArticleRow | null>(null)
  const [defaultSens, setDefaultSens] = useState<'reception' | 'retrait'>('reception')
  // Stock affiché de façon optimiste pendant l'enregistrement des ±1
  const [optimistic, setOptimistic] = useState<Record<string, number>>({})

  // Remet à zéro l'optimisme dès que le serveur renvoie des données fraîches
  useEffect(() => { setOptimistic({}) }, [articles])

  const stockOf = (a: ArticleRow) => optimistic[a.id] ?? a.stock

  const quickMove = async (a: ArticleRow, sens: 'reception' | 'retrait') => {
    const delta = sens === 'reception' ? 1 : -1
    setOptimistic((o) => ({ ...o, [a.id]: stockOf(a) + delta }))
    const res = await createMouvement({
      date: new Date().toISOString().split('T')[0],
      article_id: a.id,
      quantite: 1,
      sens,
      motif: '',
    })
    if (res.error) {
      setOptimistic((o) => ({ ...o, [a.id]: (o[a.id] ?? a.stock) - delta }))
      alert(res.error)
      return
    }
    router.refresh()
  }

  // Recherche + filtre par variante + filtre phares
  const [search, setSearch] = useState('')
  const [variFilter, setVariFilter] = useState('all')
  const [onlyPhare, setOnlyPhare] = useState(false)

  // Variantes présentes (pour le filtre)
  const variantes = useMemo(
    () => Array.from(new Set(articles.map((a) => a.variante))).sort((a, b) => a.localeCompare(b, 'fr')),
    [articles],
  )

  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

  const filtered = useMemo(() => {
    const q = norm(search.trim())
    return articles.filter((a) => {
      if (onlyPhare && !a.phare) return false
      if (variFilter !== 'all' && a.variante !== variFilter) return false
      if (!q) return true
      return norm(`${a.modele_nom} ${a.variante} ${a.taille}`).includes(q)
    })
  }, [articles, search, variFilter, onlyPhare])

  // Regroupe par modèle
  const groups = useMemo(() => {
    const map = new Map<string, ArticleRow[]>()
    for (const a of filtered) {
      const list = map.get(a.modele_nom) ?? []
      list.push(a)
      map.set(a.modele_nom, list)
    }
    return Array.from(map.entries())
  }, [filtered])

  const stockTotal = filtered.reduce((s, a) => s + stockOf(a), 0)
  const filtering = search.trim() !== '' || variFilter !== 'all' || onlyPhare

  if (articles.length === 0) {
    return (
      <p className="text-center text-slate-500 py-12">
        Aucun article. Crée un modèle dans l’onglet <span className="text-slate-300">Modèles</span>.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-slate-400">{filtering ? 'Stock filtré' : 'Stock total'}</span>
        <span className="text-xl font-bold text-slate-100">{stockTotal}</span>
      </div>

      {/* Recherche + filtre par variante */}
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
          value={variFilter}
          onChange={(e) => setVariFilter(e.target.value)}
          className="input w-auto shrink-0"
          aria-label="Filtrer par variante"
        >
          <option value="all">Toutes variantes</option>
          {variantes.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <button
          onClick={() => setOnlyPhare((v) => !v)}
          aria-pressed={onlyPhare}
          title="N'afficher que les variantes phares"
          className={`shrink-0 w-11 rounded-lg border text-lg leading-none transition-colors ${
            onlyPhare
              ? 'border-amber-500/50 bg-amber-500/15 text-amber-400'
              : 'border-slate-700 bg-slate-950 text-slate-500 hover:text-slate-300'
          }`}
        >
          {onlyPhare ? '★' : '☆'}
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Touche <span className="text-emerald-400 font-semibold">+</span> /{' '}
        <span className="text-red-400 font-semibold">−</span> pour ajuster d’une unité, ou le nom de
        l’article pour une réception/retrait en quantité.
      </p>

      {groups.length === 0 && (
        <p className="text-center text-slate-500 py-8">Aucun article ne correspond.</p>
      )}

      {groups.map(([nom, rows]) => (
        <div key={nom} className="space-y-1.5">
          <h3 className="text-sm font-semibold text-slate-300">{nom}</h3>
          <div className="space-y-1.5">
            {rows.map((a) => {
              const stock = stockOf(a)
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl pl-4 pr-2 py-1.5"
                >
                  <button
                    onClick={() => { setDefaultSens('reception'); setTarget(a) }}
                    className="flex-1 min-w-0 text-left text-sm text-slate-300 py-1.5 hover:text-slate-100 transition-colors"
                  >
                    {a.variante} · <span className="font-medium text-slate-200">{a.taille}</span>
                  </button>
                  <span className={`w-7 text-center text-sm font-bold tabular-nums ${
                    stock <= 0 ? 'text-red-400' : stock <= 3 ? 'text-amber-400' : 'text-slate-100'
                  }`}>
                    {stock}
                  </span>
                  <button
                    onClick={() => quickMove(a, 'retrait')}
                    aria-label="Retirer une unité"
                    className="w-8 h-8 shrink-0 rounded-lg bg-red-600/15 text-red-400 text-lg font-bold leading-none active:bg-red-600/30 transition-colors"
                  >
                    −
                  </button>
                  <button
                    onClick={() => quickMove(a, 'reception')}
                    aria-label="Ajouter une unité"
                    className="w-8 h-8 shrink-0 rounded-lg bg-emerald-600/15 text-emerald-400 text-lg font-bold leading-none active:bg-emerald-600/30 transition-colors"
                  >
                    +
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <MovementsHistory mouvements={mouvements} />

      {target && (
        <MovementSheet
          article={target}
          defaultSens={defaultSens}
          onClose={() => setTarget(null)}
          onDone={() => { setTarget(null); router.refresh() }}
        />
      )}
    </div>
  )
}

function MovementsHistory({ mouvements }: { mouvements: Mouvement[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce mouvement ?')) return
    setDeleting(id)
    await deleteMouvement(id)
    setDeleting(null)
    router.refresh()
  }

  if (mouvements.length === 0) return null

  return (
    <div className="space-y-1.5 pt-2">
      <h3 className="text-sm font-semibold text-slate-300">Historique des mouvements</h3>
      <div className="space-y-1.5">
        {mouvements.map((m) => {
          const isRecep = m.sens === 'reception'
          return (
            <div key={m.id} className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5">
              <span className={`text-base font-bold shrink-0 w-10 text-center ${isRecep ? 'text-emerald-400' : 'text-red-400'}`}>
                {isRecep ? '+' : '−'}{m.quantite}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-300 truncate">{m.modele_nom} · {m.variante} · {m.taille}</div>
                <div className="text-xs text-slate-500">
                  {new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  {m.motif && <span> · {m.motif}</span>}
                </div>
              </div>
              <button
                onClick={() => handleDelete(m.id)}
                disabled={deleting === m.id}
                className="text-xs text-red-500/70 hover:text-red-400 shrink-0 disabled:opacity-50"
              >
                Sup.
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MovementSheet({
  article,
  defaultSens,
  onClose,
  onDone,
}: {
  article: ArticleRow
  defaultSens: 'reception' | 'retrait'
  onClose: () => void
  onDone: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [sens, setSens] = useState<'reception' | 'retrait'>(defaultSens)
  const [quantite, setQuantite] = useState(1)
  const [motif, setMotif] = useState('')
  const [date, setDate] = useState(today)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    const result = await createMouvement({ date, article_id: article.id, quantite, sens, motif })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    onDone()
  }

  const nouveauStock = article.stock + (sens === 'reception' ? quantite : -quantite)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl p-5 pb-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold">{article.modele_nom}</h2>
            <p className="text-xs text-slate-500">{article.variante} · {article.taille} · stock {article.stock}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">×</button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setSens('reception')}
            className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors ${
              sens === 'reception' ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Réception (+)
          </button>
          <button
            onClick={() => setSens('retrait')}
            className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors ${
              sens === 'retrait' ? 'bg-red-700 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Retrait (−)
          </button>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1.5">Quantité</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantite((q) => Math.max(1, q - 1))}
              className="w-11 h-11 rounded-xl bg-slate-800 text-xl font-bold text-slate-300 active:bg-slate-700"
            >−</button>
            <input
              type="number" inputMode="numeric" min={1} value={quantite}
              onChange={(e) => setQuantite(Math.max(1, Math.round(Number(e.target.value) || 1)))}
              className="input flex-1 text-center font-semibold"
            />
            <button
              onClick={() => setQuantite((q) => q + 1)}
              className="w-11 h-11 rounded-xl bg-slate-800 text-xl font-bold text-slate-300 active:bg-slate-700"
            >+</button>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Nouveau stock : <span className={nouveauStock < 0 ? 'text-red-400' : 'text-slate-300'}>{nouveauStock}</span>
          </p>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Motif</label>
          <input
            type="text" value={motif} onChange={(e) => setMotif(e.target.value)}
            className="input w-full"
            placeholder={sens === 'reception' ? 'Réception colis…' : 'Perte, casse, cadeau…'}
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-full" />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className={`w-full py-3.5 rounded-2xl font-semibold text-base transition-colors disabled:opacity-50 ${
            sens === 'reception' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {saving ? 'Enregistrement…' : sens === 'reception' ? 'Ajouter au stock' : 'Retirer du stock'}
        </button>
      </div>
    </div>
  )
}
