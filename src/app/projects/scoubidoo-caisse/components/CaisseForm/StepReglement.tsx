'use client'

import type { CaisseFields } from '../../lib/types'
import { computeAll } from '../../lib/formulas'

type Props = {
  form: CaisseFields
  setNum: (field: string, value: string) => void
  calc: ReturnType<typeof computeAll>
}

function Row({ label, value, onChange, hint }: {
  label: string; value: number | null | undefined; onChange: (v: string) => void; hint?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <span className="text-sm text-slate-300">{label}</span>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <input type="number" inputMode="decimal" step="0.01"
          value={value ?? ''} onChange={(e) => onChange(e.target.value)}
          className="w-32 bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-right text-sm font-mono focus:outline-none focus:border-blue-500"
          placeholder="0,00"
        />
        <span className="text-xs text-slate-500 w-3">€</span>
      </div>
    </div>
  )
}

export default function StepReglement({ form, setNum, calc }: Props) {
  const deltaCBv2 = calc.delta_cb_v2
  const deltaTTC = calc.delta_ttc
  const cbOk = Math.abs(deltaCBv2) < 0.01
  const ttcOk = Math.abs(deltaTTC) < 0.01

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Rapport X — 2ème lecture</h2>
      <div className="bg-blue-950/40 border border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-300">
        Éditez à nouveau le rapport X dans L&apos;Addition après avoir saisi les ajustements.
      </div>

      <section className="space-y-1">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Nouvelles valeurs</h3>
        <Row label="CB v2 (après ajustements)" value={form.reglement_service_cb_v2} onChange={(v) => setNum('reglement_service_cb_v2', v)} />
        <Row label="Cash v2" value={form.reglement_service_cash_v2} onChange={(v) => setNum('reglement_service_cash_v2', v)} />
        <Row label="Total HT" value={form.total_service_ht} onChange={(v) => setNum('total_service_ht', v)} />
        <Row label="Total TTC" value={form.total_service_ttc} onChange={(v) => setNum('total_service_ttc', v)} />
      </section>

      {/* Vérifications */}
      <section className="space-y-3 pt-3 border-t border-slate-700">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide">Vérifications</h3>

        <div className={`flex justify-between items-center rounded-xl px-4 py-3 border ${cbOk ? 'bg-emerald-950/40 border-emerald-800' : 'bg-red-950/40 border-red-800'}`}>
          <div>
            <div className="text-sm font-medium">CB v2 vs CA CB</div>
            <div className="text-xs text-slate-400">CB v2 doit égaler CA CB</div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold font-mono ${cbOk ? 'text-emerald-400' : 'text-red-400'}`}>
              {deltaCBv2 >= 0 ? '+' : ''}{deltaCBv2.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </div>
            <div className="text-xs text-slate-500">CA CB : {calc.ca_cb.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
          </div>
        </div>

        <div className={`flex justify-between items-center rounded-xl px-4 py-3 border ${ttcOk ? 'bg-emerald-950/40 border-emerald-800' : 'bg-red-950/40 border-red-800'}`}>
          <div>
            <div className="text-sm font-medium">TTC vs Total CA v2</div>
            <div className="text-xs text-slate-400">TTC doit égaler la somme des règlements</div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold font-mono ${ttcOk ? 'text-emerald-400' : 'text-red-400'}`}>
              {deltaTTC >= 0 ? '+' : ''}{deltaTTC.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </div>
            <div className="text-xs text-slate-500">CA v2 : {calc.total_ca_v2.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
          </div>
        </div>
      </section>
    </div>
  )
}
