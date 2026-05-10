'use client'

import type { CaisseFields } from '../../lib/types'
import { computeAll } from '../../lib/formulas'

type Props = {
  form: CaisseFields
  set: (field: string, value: unknown) => void
  calc: ReturnType<typeof computeAll>
}

function DeltaRow({ label, value, invertedColor }: { label: string; value: number; invertedColor?: boolean }) {
  const ok = Math.abs(value) < 0.01
  const positive = value > 0.01

  let color = 'text-emerald-400'
  if (!ok) {
    if (invertedColor) {
      color = positive ? 'text-blue-400' : 'text-red-400'
    } else {
      color = 'text-red-400'
    }
  }

  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
      <span className="text-sm text-slate-300">{label}</span>
      <span className={`text-sm font-mono font-semibold ${color}`}>
        {value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
      </span>
    </div>
  )
}

function SummaryRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-blue-400' : 'text-slate-200'}`}>
        {value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
      </span>
    </div>
  )
}

export default function StepVerification({ form, set, calc }: Props) {
  const allOk =
    Math.abs(calc.delta) < 0.01 &&
    Math.abs(calc.delta_encaissement_cash) < 0.01 &&
    Math.abs(calc.delta_encaissement_cb) < 0.01 &&
    Math.abs(calc.reglement_verifier) < 0.01

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Vérification</h2>

      {/* Statut global */}
      <div className={`rounded-xl p-4 border text-center ${allOk ? 'bg-emerald-950/40 border-emerald-700' : 'bg-amber-950/40 border-amber-700'}`}>
        <div className={`text-lg font-bold ${allOk ? 'text-emerald-400' : 'text-amber-400'}`}>
          {allOk ? 'Caisse équilibrée' : 'Vérifier les écarts'}
        </div>
      </div>

      {/* Contrôles */}
      <section className="bg-slate-900/50 rounded-xl border border-slate-800 divide-y divide-slate-800">
        <DeltaRow label="Delta espèces" value={calc.delta} />
        <DeltaRow label="Delta encaissement cash" value={calc.delta_encaissement_cash} />
        <DeltaRow label="Delta encaissement CB" value={calc.delta_encaissement_cb} />
        <DeltaRow label="Règlement vérifier" value={calc.reglement_verifier} />
        <DeltaRow label="Écart cash service" value={calc.ecart_cash_service} />
        <DeltaRow label="CB − Écart service" value={calc.cb_ecart_service} invertedColor />
      </section>

      {/* Résumé CA */}
      <section className="bg-slate-900/50 rounded-xl border border-slate-800 divide-y divide-slate-800 px-4">
        <SummaryRow label="Full CA" value={calc.full_ca} highlight />
        <SummaryRow label="HT + Poire" value={calc.ht_plus_poire} />
        <SummaryRow label="À mettre au frais" value={calc.a_mettre_au_frais} />
        <SummaryRow label="Encaissements cash réels" value={calc.total_encaissements_cash_reel} />
        <SummaryRow label="Encaissements CB réels" value={calc.total_encaissements_cb_reel} />
      </section>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm text-slate-400 block">Notes</label>
        <textarea
          value={(form as { notes?: string }).notes ?? ''}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          placeholder="Observations du service…"
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      <p className="text-xs text-slate-500 text-center">
        Appuyez sur &quot;Fermer la caisse&quot; ci-dessous pour finaliser le service.
      </p>
    </div>
  )
}
