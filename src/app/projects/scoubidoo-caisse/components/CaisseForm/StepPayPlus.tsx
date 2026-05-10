'use client'

import type { CaisseFields } from '../../lib/types'
import { computeAll } from '../../lib/formulas'

type Props = {
  form: CaisseFields
  setNum: (field: string, value: string) => void
  calc: ReturnType<typeof computeAll>
}

function NumField({ label, value, onChange, hint }: {
  label: string
  value: number | null | undefined
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-slate-300">{label}</label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="input w-40 text-right"
          placeholder="0,00"
        />
        <span className="text-slate-400 text-sm">€</span>
      </div>
    </div>
  )
}

export default function StepPayPlus({ form, setNum, calc }: Props) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">TPE Pay+ (intégré L&apos;Addition)</h2>
      <p className="text-xs text-slate-400">
        Logique J/J+1 : encaissements du rapport X − ventes service − J+1 de la veille.
      </p>

      <NumField label="Rapport X"
        value={form.payplus_rapport_x} onChange={(v) => setNum('payplus_rapport_x', v)}
        hint="Total Pay+ vu sur le rapport X du soir" />

      <NumField label="Ventes service"
        value={form.payplus_ventes_service} onChange={(v) => setNum('payplus_ventes_service', v)} />

      <NumField label="J+1"
        value={form.payplus_jplus1} onChange={(v) => setNum('payplus_jplus1', v)}
        hint="Encaissé après minuit sur ce service" />

      <NumField label="J+1 de la veille"
        value={form.payplus_jplus1_de_la_veille} onChange={(v) => setNum('payplus_jplus1_de_la_veille', v)}
        hint="Pré-rempli depuis le service précédent" />

      <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
        <span className="text-sm text-slate-400">Pay+ encaissements</span>
        <span className={`text-xl font-bold ${Math.abs(calc.payplus_encaissements) < 0.01 ? 'text-slate-400' : 'text-blue-400'}`}>
          {calc.payplus_encaissements.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </span>
      </div>

      <div className="border-t border-slate-700 pt-4 space-y-4">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Pourboires Pay+</h3>
        <NumField label="Cumul pourboire"
          value={form.payplus_cumul_pourboire} onChange={(v) => setNum('payplus_cumul_pourboire', v)} />
        <NumField label="Pourboire service"
          value={form.payplus_pourboire_service} onChange={(v) => setNum('payplus_pourboire_service', v)} />
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">Pourboire Pay+ service</span>
          <span className="text-lg font-semibold text-slate-200">
            {calc.payplus_pourboire.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      </div>
    </div>
  )
}
