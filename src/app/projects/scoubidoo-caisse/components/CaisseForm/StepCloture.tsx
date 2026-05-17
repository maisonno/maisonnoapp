'use client'

import type { CaisseFields } from '../../lib/types'
import { computeAll } from '../../lib/formulas'

type Props = {
  form: CaisseFields
  setNum: (field: string, value: string) => void
  calc: ReturnType<typeof computeAll>
}

function SummaryRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-mono font-semibold ${highlight ? 'text-blue-400' : 'text-slate-200'}`}>
        {value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
      </span>
    </div>
  )
}

export default function StepCloture({ form, calc }: Omit<Props, 'setNum'> & { setNum?: Props['setNum'] }) {
  const delta = calc.delta_cloture
  const ok = Math.abs(delta) < 0.01

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Clôture</h2>
      <div className="bg-blue-950/40 border border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-300">
        Vérifiez les totaux, puis cliquez sur &ldquo;Fermer la caisse&rdquo;.
      </div>

      {/* Récap */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 px-4 py-3">
        <SummaryRow label="Full CA" value={calc.full_ca} highlight />
        <SummaryRow label="Encaissement CB net" value={calc.encaissement_cb_net} />
        <SummaryRow label="CA Cash" value={calc.ca_cash} />
        <SummaryRow label="Fond de caisse" value={form.fond_caisse_soir ?? 0} />
        <SummaryRow label="Mis au coffre" value={form.mis_au_coffre ?? 0} />
        <SummaryRow label="Poire" value={form.poire ?? 0} />
      </div>

      {/* Vérification finale */}
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
