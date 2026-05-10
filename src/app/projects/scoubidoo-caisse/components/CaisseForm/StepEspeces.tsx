'use client'

import type { CaisseFields } from '../../lib/types'
import { computeAll } from '../../lib/formulas'

type Props = {
  form: CaisseFields
  setInt: (field: string, value: number) => void
  setNum: (field: string, value: string) => void
  calc: ReturnType<typeof computeAll>
}

const BILLETS: { field: keyof CaisseFields; label: string; valeur: number }[] = [
  { field: 'billets_500', label: '500 €', valeur: 500 },
  { field: 'billets_200', label: '200 €', valeur: 200 },
  { field: 'billets_100', label: '100 €', valeur: 100 },
  { field: 'billets_50',  label: '50 €',  valeur: 50  },
  { field: 'billets_20',  label: '20 €',  valeur: 20  },
  { field: 'billets_10',  label: '10 €',  valeur: 10  },
  { field: 'billets_5',   label: '5 €',   valeur: 5   },
]

const PIECES: { field: keyof CaisseFields; label: string }[] = [
  { field: 'pieces_2',   label: '2 €'   },
  { field: 'pieces_1',   label: '1 €'   },
  { field: 'pieces_50c', label: '50 c'  },
  { field: 'pieces_20c', label: '20 c'  },
  { field: 'pieces_10c', label: '10 c'  },
]

const POIDS: { field: keyof CaisseFields; nbField: keyof ReturnType<typeof computeAll>; label: string }[] = [
  { field: 'poids_pieces_2',   nbField: 'nb_pieces_2',   label: '2 €'  },
  { field: 'poids_pieces_1',   nbField: 'nb_pieces_1',   label: '1 €'  },
  { field: 'poids_pieces_50c', nbField: 'nb_pieces_50c', label: '50 c' },
  { field: 'poids_pieces_20c', nbField: 'nb_pieces_20c', label: '20 c' },
  { field: 'poids_pieces_10c', nbField: 'nb_pieces_10c', label: '10 c' },
]

function PlusMinusRow({
  label, value, onInc, onDec,
}: { label: string; value: number; onInc: () => void; onDec: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-sm text-slate-300 font-medium">{label}</span>
      <button
        type="button"
        onClick={onDec}
        className="w-11 h-11 rounded-xl bg-slate-700 hover:bg-slate-600 text-xl font-bold transition-colors"
      >
        −
      </button>
      <span className="w-10 text-center text-lg font-mono font-semibold">{value}</span>
      <button
        type="button"
        onClick={onInc}
        className="w-11 h-11 rounded-xl bg-slate-700 hover:bg-slate-600 text-xl font-bold transition-colors"
      >
        +
      </button>
    </div>
  )
}

export default function StepEspeces({ form, setInt, setNum, calc }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Compter la caisse</h2>

      {/* Comptage manuel */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Billets</h3>
        {BILLETS.map(({ field, label }) => (
          <PlusMinusRow
            key={field}
            label={label}
            value={(form[field] as number) ?? 0}
            onInc={() => setInt(field, ((form[field] as number) ?? 0) + 1)}
            onDec={() => setInt(field, ((form[field] as number) ?? 0) - 1)}
          />
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Pièces</h3>
        {PIECES.map(({ field, label }) => (
          <PlusMinusRow
            key={field}
            label={label}
            value={(form[field] as number) ?? 0}
            onInc={() => setInt(field, ((form[field] as number) ?? 0) + 1)}
            onDec={() => setInt(field, ((form[field] as number) ?? 0) - 1)}
          />
        ))}
      </section>

      {/* Comptage au poids */}
      <section className="space-y-3 pt-2 border-t border-slate-700">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Pesée (g)</h3>
        {POIDS.map(({ field, nbField, label }) => (
          <div key={field} className="flex items-center gap-3">
            <span className="w-16 text-sm text-slate-300 font-medium">{label}</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={(form[field] as number | null) ?? ''}
              onChange={(e) => setNum(field, e.target.value)}
              placeholder="0"
              className="w-28 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-center text-sm focus:outline-none focus:border-blue-500"
            />
            <span className="text-xs text-slate-400">
              ≈ {(calc[nbField as keyof typeof calc] as number).toFixed(1)} pcs
            </span>
          </div>
        ))}
      </section>

      {/* Total */}
      <div className="pt-4 border-t border-slate-700 text-center">
        <div className="text-slate-400 text-sm">Total caisse soir</div>
        <div className="text-4xl font-bold mt-1 text-blue-400">
          {calc.total_caisse_soir.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </div>
      </div>

      {/* Fond de caisse matin */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-300 w-40">Fond de caisse matin</label>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={(form.fond_caisse_matin as number | null) ?? ''}
          onChange={(e) => setNum('fond_caisse_matin', e.target.value)}
          className="input w-36 text-right"
        />
        <span className="text-slate-400 text-sm">€</span>
      </div>
    </div>
  )
}
