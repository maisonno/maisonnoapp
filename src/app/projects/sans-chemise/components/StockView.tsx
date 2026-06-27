'use client'

import { useMemo, useState } from 'react'
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

  // Regroupe par modèle
  const groups = useMemo(() => {
    const map = new Map<string, ArticleRow[]>()
    for (const a of articles) {
      const list = map.get(a.modele_nom) ?? []
      list.push(a)
      map.set(a.modele_nom, list)
    }
    return Array.from(map.entries())
  }, [articles])

  const stockTotal = articles.reduce((s, a) => s + a.stock, 0)

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
        <span className="text-sm text-slate-400">Stock total</span>
        <span className="text-xl font-bold text-slate-100">{stockTotal}</span>
      </div>

      <p className="text-xs text-slate-500">
        Touche un article pour <span className="text-emerald-400">réceptionner un colis</span> ou{' '}
        <span className="text-red-400">retirer du stock</span>.
      </p>

      {groups.map(([nom, rows]) => (
        <div key={nom} className="space-y-1.5">
          <h3 className="text-sm font-semibold text-slate-300">{nom}</h3>
          <div className="space-y-1.5">
            {rows.map((a) => (
              <button
                key={a.id}
                onClick={() => { setDefaultSens('reception'); setTarget(a) }}
                className="w-full flex items-center justify-between bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl px-4 py-2.5 transition-colors"
              >
                <span className="text-sm text-slate-300">
                  {a.variante} · <span className="font-medium text-slate-200">{a.taille}</span>
                </span>
                <span className={`text-sm font-bold ${
                  a.stock <= 0 ? 'text-red-400' : a.stock <= 3 ? 'text-amber-400' : 'text-slate-100'
                }`}>
                  {a.stock}
                </span>
              </button>
            ))}
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
