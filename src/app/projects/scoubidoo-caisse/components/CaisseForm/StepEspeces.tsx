'use client'

import type { CaisseFields } from '../../lib/types'
import { computeAll } from '../../lib/formulas'

type Props = {
  form: CaisseFields
  setInt: (field: string, value: number) => void
  setNum: (field: string, value: string) => void
  calc: ReturnType<typeof computeAll>
}

const BILLETS: { field: keyof CaisseFields; label: string }[] = [
  { field: 'billets_500', label: '500 €' },
  { field: 'billets_200', label: '200 €' },
  { field: 'billets_100', label: '100 €' },
  { field: 'billets_50',  label: '50 €'  },
  { field: 'billets_20',  label: '20 €'  },
  { field: 'billets_10',  label: '10 €'  },
  { field: 'billets_5',   label: '5 €'   },
]

const PIECES: {
  qtyField: keyof CaisseFields
  poidsField: keyof CaisseFields
  nbField: keyof ReturnType<typeof computeAll>
  label: string
}[] = [
  { qtyField: 'pieces_2',   poidsField: 'poids_pieces_2',   nbField: 'nb_pieces_2',   label: '2 €'  },
  { qtyField: 'pieces_1',   poidsField: 'poids_pieces_1',   nbField: 'nb_pieces_1',   label: '1 €'  },
  { qtyField: 'pieces_50c', poidsField: 'poids_pieces_50c', nbField: 'nb_pieces_50c', label: '50 c' },
  { qtyField: 'pieces_20c', poidsField: 'poids_pieces_20c', nbField: 'nb_pieces_20c', label: '20 c' },
  { qtyField: 'pieces_10c', poidsField: 'poids_pieces_10c', nbField: 'nb_pieces_10c', label: '10 c' },
]

export default function StepEspeces({ form, setInt, setNum, calc }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Compter la caisse</h2>

      {/* Billets */}
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Billets</h3>
        {BILLETS.map(({ field, label }) => {
          const val = (form[field] as number) ?? 0
          return (
            <div key={field} className="flex items-center gap-2">
              <span className="w-14 text-sm text-slate-300 font-medium shrink-0">{label}</span>
              <button
                type="button"
                onClick={() => setInt(field, val - 1)}
                className="w-11 h-11 rounded-xl bg-slate-700 hover:bg-slate-600 text-xl font-bold transition-colors shrink-0"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={val === 0 ? '' : val}
                onChange={(e) => setInt(field, parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-16 bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-center text-lg font-mono font-semibold focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setInt(field, val + 1)}
                className="w-11 h-11 rounded-xl bg-slate-700 hover:bg-slate-600 text-xl font-bold transition-colors shrink-0"
              >
                +
              </button>
            </div>
          )
        })}
      </section>

      {/* Pièces : qty + poids sur la même ligne */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 pb-1">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide flex-1">Pièces</h3>
          <span className="text-xs text-slate-500 w-20 text-center">Qté</span>
          <span className="text-xs text-slate-500 w-20 text-center">Poids (g)</span>
          <span className="text-xs text-slate-500 w-14 text-right">≈ pcs</span>
        </div>
        {PIECES.map(({ qtyField, poidsField, nbField, label }) => {
          const qty = (form[qtyField] as number) ?? 0
          const poids = (form[poidsField] as number | null) ?? null
          const nb = (calc[nbField as keyof typeof calc] as number)
          return (
            <div key={qtyField} className="flex items-center gap-2">
              <span className="w-14 text-sm text-slate-300 font-medium shrink-0">{label}</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={qty === 0 ? '' : qty}
                onChange={(e) => setInt(qtyField, parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-20 bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-center text-sm font-mono focus:outline-none focus:border-blue-500"
              />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={poids ?? ''}
                onChange={(e) => setNum(poidsField, e.target.value)}
                placeholder="—"
                className="w-20 bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-center text-sm font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="w-14 text-xs text-slate-400 text-right font-mono">
                {nb > 0 ? `≈ ${nb.toFixed(1)}` : '—'}
              </span>
            </div>
          )
        })}
      </section>

      {/* Total */}
      <div className="pt-4 border-t border-slate-700 text-center">
        <div className="text-slate-400 text-sm">Total caisse soir</div>
        <div className="text-4xl font-bold mt-1 text-blue-400">
          {calc.total_caisse_soir.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </div>
      </div>
    </div>
  )
}
