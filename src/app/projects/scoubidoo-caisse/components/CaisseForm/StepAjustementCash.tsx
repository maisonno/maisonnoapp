'use client'

import type { CaisseFields } from '../../lib/types'
import { computeAll } from '../../lib/formulas'

type Props = {
  form: CaisseFields
  setNum: (field: string, value: string) => void
  calc: ReturnType<typeof computeAll>
}

export default function StepAjustementCash({ form, calc }: Props) {
  const delta = calc.delta_cash_v1
  const pct = calc.pct_delta_cash
  const alertHigh = Math.abs(pct) > 10
  const ok = Math.abs(delta) < 0.01

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Ajustement Cash</h2>

      {/* Delta Cash v1 */}
      <div className={`rounded-2xl p-5 border text-center ${
        ok ? 'bg-emerald-950/40 border-emerald-700' :
        alertHigh ? 'bg-red-950/40 border-red-700' :
        'bg-amber-950/40 border-amber-700'
      }`}>
        <div className="text-xs text-slate-400 mb-1">Delta Cash v1</div>
        <div className={`text-4xl font-bold font-mono ${ok ? 'text-emerald-400' : alertHigh ? 'text-red-400' : 'text-amber-400'}`}>
          {delta >= 0 ? '+' : ''}{delta.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </div>
        {!ok && (
          <div className={`text-lg font-semibold mt-2 ${alertHigh ? 'text-red-400' : 'text-amber-400'}`}>
            {pct >= 0 ? '+' : ''}{pct.toFixed(1)} % du CA
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 px-4 py-3 space-y-1 text-sm text-slate-400">
        <div className="flex justify-between">
          <span>CA Cash</span>
          <span className="font-mono text-slate-200">{calc.ca_cash.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
        </div>
        <div className="flex justify-between">
          <span>Cash v1 (rapport X)</span>
          <span className="font-mono text-slate-200">
            {(form.reglement_service_cash ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Total CA v1</span>
          <span className="font-mono text-slate-200">{calc.total_ca_v1.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
        </div>
      </div>

      {/* Instruction si écart > 10% */}
      {alertHigh && (
        <div className="bg-red-950/40 border border-red-800 rounded-xl px-4 py-3 text-sm space-y-2">
          <p className="font-medium text-red-300">Écart supérieur à 10 %</p>
          <p className="text-slate-400">
            Saisir un ajustement cash dans L&apos;Addition pour corriger l&apos;écart de{' '}
            <strong className="text-red-400">{delta.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</strong>.
          </p>
        </div>
      )}
      {!alertHigh && !ok && (
        <p className="text-sm text-amber-400 text-center">
          Écart inférieur à 10 % — pas d&apos;ajustement obligatoire.
        </p>
      )}
      {ok && (
        <p className="text-sm text-emerald-400 text-center">Cash équilibré.</p>
      )}
    </div>
  )
}
