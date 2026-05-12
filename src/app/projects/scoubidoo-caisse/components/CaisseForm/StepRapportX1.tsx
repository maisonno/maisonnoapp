'use client'

import type { CaisseFields } from '../../lib/types'
import { computeAll } from '../../lib/formulas'

type Props = {
  form: CaisseFields
  setNum: (field: string, value: string) => void
  calc: ReturnType<typeof computeAll>
}

function NumField({ label, value, onChange, hint }: {
  label: string; value: number | null | undefined; onChange: (v: string) => void; hint?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <span className="text-sm text-slate-300">{label}</span>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="number" inputMode="decimal" step="0.01"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-32 bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-right text-sm font-mono focus:outline-none focus:border-blue-500"
          placeholder="0,00"
        />
        <span className="text-xs text-slate-500 w-3">€</span>
      </div>
    </div>
  )
}

export default function StepRapportX1({ form, setNum, calc }: Props) {
  const totalCAv1 = calc.total_ca_v1

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Rapport X — 1ère lecture</h2>

      <div className="bg-blue-950/40 border border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-300">
        Initiez la clôture dans L&apos;Addition et imprimez le rapport X avant de saisir.
      </div>

      <section className="space-y-1">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Paramètres</h3>
        <NumField label="Fond de caisse" value={form.fond_caisse_matin} onChange={(v) => setNum('fond_caisse_matin', v)} />
        <NumField label="Mouvement de monnaie" value={form.mouvement_monnaie} onChange={(v) => setNum('mouvement_monnaie', v)}
          hint="Bon de monnaie remis (négatif si retiré)" />
      </section>

      <section className="space-y-1 pt-3 border-t border-slate-700">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Règlements du service</h3>
        <NumField label="Comptes client" value={form.reglement_service_compte_client} onChange={(v) => setNum('reglement_service_compte_client', v)} />
        <NumField label="CB v1" value={form.reglement_cb_du_service_v1} onChange={(v) => setNum('reglement_cb_du_service_v1', v)}
          hint="Total CB sur le rapport X (avant ajustements)" />
        <NumField label="Cash v1" value={form.reglement_service_cash} onChange={(v) => setNum('reglement_service_cash', v)} />
        <NumField label="Trop perçu" value={form.reglement_service_trop_percu_cb} onChange={(v) => setNum('reglement_service_trop_percu_cb', v)} />
        <NumField label="Pay at table" value={form.reglement_service_pay_at_table} onChange={(v) => setNum('reglement_service_pay_at_table', v)} />
        <NumField label="Pay+" value={form.reglement_service_payplus} onChange={(v) => setNum('reglement_service_payplus', v)} />
        <NumField label="Autres / Chèque" value={form.reglement_autres_cheque} onChange={(v) => setNum('reglement_autres_cheque', v)} />
      </section>

      <section className="space-y-1 pt-3 border-t border-slate-700">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Règlements différés (rapport X)</h3>
        <NumField label="Différés CB" value={form.reglement_differe_cb} onChange={(v) => setNum('reglement_differe_cb', v)}
          hint="Encaissements J+1 de la veille apparaissant ce soir" />
        <NumField label="Différés Cash" value={form.reglement_differe_cash} onChange={(v) => setNum('reglement_differe_cash', v)} />
      </section>

      <div className="flex justify-between items-center pt-3 border-t border-slate-700">
        <span className="text-sm text-slate-400">Total CA v1</span>
        <span className={`text-xl font-bold font-mono ${Math.abs(totalCAv1) < 0.01 ? 'text-slate-500' : 'text-blue-400'}`}>
          {totalCAv1.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </span>
      </div>
    </div>
  )
}
