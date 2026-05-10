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

export default function StepRapportX1({ form, setNum, calc }: Props) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Rapport X — 1ère lecture</h2>
      <p className="text-xs text-slate-400">
        Valeurs lues sur le rapport X <strong>avant</strong> saisie des ajustements dans L&apos;Addition.
      </p>

      <NumField
        label="CB v1 (avant ajustements)"
        value={form.reglement_cb_du_service_v1}
        onChange={(v) => setNum('reglement_cb_du_service_v1', v)}
        hint="Total CB affiché sur le premier rapport X"
      />

      <NumField
        label="Cash"
        value={form.reglement_service_cash}
        onChange={(v) => setNum('reglement_service_cash', v)}
        hint="Total cash affiché sur le rapport X"
      />

      <div className="pt-4 border-t border-slate-700 space-y-2 text-sm text-slate-400">
        <p className="font-medium text-slate-300">Étape suivante</p>
        <p>Saisissez maintenant dans L&apos;Addition les corrections CB (Pay+, S&P) pour obtenir les valeurs v2.</p>
      </div>

      {/* Rappel encaissements CB réels calculés */}
      <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
        <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">Encaissements CB réels (pour référence)</div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Pay+ encaissements</span>
          <span className="font-mono text-slate-200">
            {calc.payplus_encaissements !== 0
              ? calc.payplus_encaissements.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
              : '— (saisir Pay+ d\'abord)'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">CB S&amp;P service</span>
          <span className="font-mono text-slate-200">
            {calc.sp_cb_service !== 0
              ? calc.sp_cb_service.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
              : '— (saisir S&P d\'abord)'}
          </span>
        </div>
        <div className="flex justify-between text-sm font-semibold pt-1 border-t border-slate-700">
          <span className="text-slate-300">Total CB réel</span>
          <span className="text-blue-400 font-mono">
            {calc.total_encaissements_cb_reel.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      </div>
    </div>
  )
}
