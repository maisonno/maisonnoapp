'use client'

import type { CaisseFields } from '../../lib/types'
import { computeAll } from '../../lib/formulas'

type Props = {
  form: CaisseFields
  setNum: (field: string, value: string) => void
  calc: ReturnType<typeof computeAll>
}

const BILLETS_DISPLAY: { field: keyof CaisseFields; label: string; val: number }[] = [
  { field: 'billets_500', label: '500', val: 500 },
  { field: 'billets_200', label: '200', val: 200 },
  { field: 'billets_100', label: '100', val: 100 },
  { field: 'billets_50',  label: '50',  val: 50 },
  { field: 'billets_20',  label: '20',  val: 20 },
  { field: 'billets_10',  label: '10',  val: 10 },
  { field: 'billets_5',   label: '5',   val: 5 },
]
const PIECES_DISPLAY: { field: keyof CaisseFields; label: string; val: number }[] = [
  { field: 'pieces_2',   label: '2',    val: 2 },
  { field: 'pieces_1',   label: '1',    val: 1 },
  { field: 'pieces_50c', label: '0,50', val: 0.5 },
  { field: 'pieces_20c', label: '0,20', val: 0.2 },
  { field: 'pieces_10c', label: '0,10', val: 0.1 },
]

export default function StepCloture({ form, setNum, calc }: Props) {
  const reste = calc.reste_en_caisse
  const delta = calc.delta_cloture
  const ok = Math.abs(delta) < 0.01

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Clôture</h2>
      <div className="bg-blue-950/40 border border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-300">
        Clôturez le service dans L&apos;Addition et saisissez le fond de caisse.
      </div>

      {/* Composition du reste en caisse */}
      <section>
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
          Reste en caisse — {reste.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                {BILLETS_DISPLAY.map((b) => (
                  <th key={b.field} className="pb-1 px-1 text-center text-xs text-slate-400 font-normal">{b.label} €</th>
                ))}
                {PIECES_DISPLAY.map((p) => (
                  <th key={p.field} className="pb-1 px-1 text-center text-xs text-slate-400 font-normal">{p.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {BILLETS_DISPLAY.map((b) => (
                  <td key={b.field} className="py-2 px-1 text-center font-mono text-slate-200">
                    {(form[b.field] as number) ?? 0}
                  </td>
                ))}
                {PIECES_DISPLAY.map((p) => (
                  <td key={p.field} className="py-2 px-1 text-center font-mono text-slate-200">
                    {(form[p.field] as number) ?? 0}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>


      {/* Fond de caisse L'Addition */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <label className="text-sm text-slate-300 block">Fond de caisse L&apos;Addition</label>
          <p className="text-xs text-slate-500">Tel que saisi dans L&apos;Addition</p>
        </div>
        <div className="flex items-center gap-1.5">
          <input type="number" inputMode="decimal" step="0.01"
            value={form.fond_caisse_soir ?? ''}
            onChange={(e) => setNum('fond_caisse_soir', e.target.value)}
            className="w-32 bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-right text-sm font-mono focus:outline-none focus:border-blue-500"
            placeholder="0,00"
          />
          <span className="text-xs text-slate-500">€</span>
        </div>
      </div>

      {/* Vérification */}
      <div className={`rounded-2xl p-5 border text-center ${ok ? 'bg-emerald-950/40 border-emerald-700' : 'bg-red-950/40 border-red-700'}`}>
        <div className="text-xs text-slate-400 mb-1">Vérification (fond − reste + ajout)</div>
        <div className={`text-4xl font-bold font-mono ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
          {delta >= 0 ? '+' : ''}{delta.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {ok ? 'Caisse équilibrée — prête à fermer' : 'Vérifier les montants ci-dessus'}
        </div>
      </div>
    </div>
  )
}
