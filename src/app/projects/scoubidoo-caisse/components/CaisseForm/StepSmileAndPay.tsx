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

export default function StepSmileAndPay({ form, setNum, calc }: Props) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">TPE Smile &amp; Pay (physique)</h2>
      <p className="text-xs text-slate-400">
        Logique J/J+1 : encaissements du rapport X − pourboire − J+1 de la veille.
      </p>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">CB (pourboire inclus)</h3>
        <NumField label="CB J"
          value={form.sp_cb_j_pourboire_incl} onChange={(v) => setNum('sp_cb_j_pourboire_incl', v)}
          hint="Total CB du service (pourboire inclus)" />
        <NumField label="CB J+1"
          value={form.sp_cb_jplus1_pourboire_incl} onChange={(v) => setNum('sp_cb_jplus1_pourboire_incl', v)}
          hint="Encaissé après minuit sur ce service" />
        <NumField label="CB J+1 de la veille"
          value={form.sp_cb_jplus1_veille_pourboire_incl} onChange={(v) => setNum('sp_cb_jplus1_veille_pourboire_incl', v)}
          hint="Pré-rempli depuis le service précédent" />
      </section>

      <section className="space-y-4 pt-3 border-t border-slate-700">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Pourboires S&amp;P</h3>
        <NumField label="Pourboire J"
          value={form.sp_pourboire_j} onChange={(v) => setNum('sp_pourboire_j', v)} />
        <NumField label="Pourboire J+1"
          value={form.sp_pourboire_jplus1} onChange={(v) => setNum('sp_pourboire_jplus1', v)} />
        <NumField label="Pourboire J+1 de la veille"
          value={form.sp_pourboire_jplus1_de_la_veille} onChange={(v) => setNum('sp_pourboire_jplus1_de_la_veille', v)}
          hint="Pré-rempli depuis le service précédent" />
      </section>

      <div className="pt-3 border-t border-slate-700 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">Pourboire S&amp;P service</span>
          <span className="text-lg font-semibold text-slate-200">
            {calc.sp_pourboire_service.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">CB S&amp;P service (hors pourboire)</span>
          <span className={`text-xl font-bold ${Math.abs(calc.sp_cb_service) < 0.01 ? 'text-slate-400' : 'text-blue-400'}`}>
            {calc.sp_cb_service.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      </div>
    </div>
  )
}
