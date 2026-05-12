'use client'

import { useEffect } from 'react'
import type { CaisseFields } from '../../lib/types'
import { computeAll } from '../../lib/formulas'

type Props = {
  form: CaisseFields
  setNum: (field: string, value: string) => void
  calc: ReturnType<typeof computeAll>
}

export default function StepAjustementCB({ form, setNum, calc }: Props) {
  const delta = calc.delta_cb_v1
  const positive = delta > 0.01
  const negative = delta < -0.01
  const ok = !positive && !negative

  // Propose ecart_cash = -ecart_cb par défaut quand ecart_cb est saisi
  useEffect(() => {
    if (form.ecart_cb != null && form.ecart_cash == null) {
      setNum('ecart_cash', String(-form.ecart_cb))
    }
  }, [form.ecart_cb]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Ajustements CB</h2>

      {/* Delta CB v1 */}
      <div className={`rounded-2xl p-5 border text-center ${
        ok ? 'bg-emerald-950/40 border-emerald-700' :
        positive ? 'bg-blue-950/40 border-blue-700' :
        'bg-red-950/40 border-red-700'
      }`}>
        <div className="text-xs text-slate-400 mb-1">Delta CB v1</div>
        <div className={`text-4xl font-bold font-mono ${ok ? 'text-emerald-400' : positive ? 'text-blue-400' : 'text-red-400'}`}>
          {delta >= 0 ? '+' : ''}{delta.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </div>
      </div>

      {/* Instructions */}
      {!ok && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 space-y-2 text-sm">
          <p className="font-medium text-slate-200">Action dans L&apos;Addition</p>
          {positive && (
            <p className="text-slate-400">
              Delta positif → ajouter une <strong className="text-slate-200">Vente Alcool Bar</strong> de{' '}
              <strong className="text-blue-400">{delta.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</strong>.
            </p>
          )}
          {negative && (
            <p className="text-slate-400">
              Delta négatif → équilibrer via <strong className="text-slate-200">Gestion des Écarts</strong> du montant{' '}
              <strong className="text-red-400">{Math.abs(delta).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</strong>.
            </p>
          )}
        </div>
      )}
      {ok && (
        <p className="text-sm text-emerald-400 text-center">Aucun ajustement nécessaire.</p>
      )}

      {/* Saisie écarts */}
      <section className="space-y-4 pt-3 border-t border-slate-700">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Écarts à saisir</h3>
        <div className="flex items-center justify-between gap-3">
          <div>
            <label className="text-sm text-slate-300 block">Écart CB</label>
            <p className="text-xs text-slate-500">Typiquement négatif</p>
          </div>
          <div className="flex items-center gap-1.5">
            <input type="number" inputMode="decimal" step="0.01"
              value={form.ecart_cb ?? ''}
              onChange={(e) => setNum('ecart_cb', e.target.value)}
              className="w-32 bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-right text-sm font-mono focus:outline-none focus:border-blue-500"
              placeholder="0,00"
            />
            <span className="text-xs text-slate-500">€</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <label className="text-sm text-slate-300 block">Écart Cash</label>
            <p className="text-xs text-slate-500">Défaut : −Écart CB</p>
          </div>
          <div className="flex items-center gap-1.5">
            <input type="number" inputMode="decimal" step="0.01"
              value={form.ecart_cash ?? ''}
              onChange={(e) => setNum('ecart_cash', e.target.value)}
              className="w-32 bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-right text-sm font-mono focus:outline-none focus:border-blue-500"
              placeholder="0,00"
            />
            <span className="text-xs text-slate-500">€</span>
          </div>
        </div>
      </section>
    </div>
  )
}
