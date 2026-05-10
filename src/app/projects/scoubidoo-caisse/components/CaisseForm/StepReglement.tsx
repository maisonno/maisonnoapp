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

export default function StepReglement({ form, setNum, calc }: Props) {
  const verifier = calc.reglement_verifier
  const verifierOk = Math.abs(verifier) < 0.01

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Rapport X — L&apos;Addition</h2>

      <NumField label="Fond de caisse matin"
        value={form.fond_caisse_matin} onChange={(v) => setNum('fond_caisse_matin', v)}
        hint="Montant en caisse au début du service" />

      <NumField label="Total service HT"
        value={form.total_service_ht} onChange={(v) => setNum('total_service_ht', v)} />

      <NumField label="Règlement total"
        value={form.reglement_service_total} onChange={(v) => setNum('reglement_service_total', v)}
        hint="Montant total du rapport X" />

      <section className="space-y-4 pt-3 border-t border-slate-700">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Ventilations</h3>

        <NumField label="Cash"
          value={form.reglement_service_cash} onChange={(v) => setNum('reglement_service_cash', v)} />

        <NumField label="CB v2"
          value={form.reglement_service_cb_v2} onChange={(v) => setNum('reglement_service_cb_v2', v)} />

        <NumField label="Pay+"
          value={form.reglement_service_payplus} onChange={(v) => setNum('reglement_service_payplus', v)} />

        <NumField label="Compte client"
          value={form.reglement_service_compte_client} onChange={(v) => setNum('reglement_service_compte_client', v)} />

        <NumField label="Trop perçu CB"
          value={form.reglement_service_trop_percu_cb} onChange={(v) => setNum('reglement_service_trop_percu_cb', v)} />

        <NumField label="Pay at table"
          value={form.reglement_service_pay_at_table} onChange={(v) => setNum('reglement_service_pay_at_table', v)} />

        <NumField label="Autres / Chèque"
          value={form.reglement_autres_cheque} onChange={(v) => setNum('reglement_autres_cheque', v)} />
      </section>

      {/* Contrôle */}
      <div className={`pt-4 border-t border-slate-700 rounded-xl p-4 ${verifierOk ? 'bg-emerald-950/40 border-emerald-800' : 'bg-red-950/40 border-red-800'} border`}>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Règlement vérifier</span>
          <span className={`text-xl font-bold ${verifierOk ? 'text-emerald-400' : 'text-red-400'}`}>
            {verifier.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
        <p className="text-xs mt-1 text-slate-400">
          {verifierOk ? 'Ventilations cohérentes' : 'La somme des ventilations ne correspond pas au total'}
        </p>
      </div>
    </div>
  )
}
