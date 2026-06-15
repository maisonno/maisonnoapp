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
  const fond = form.fond_caisse_soir ?? 0
  const ttcOk = form.total_service_ttc != null

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Clôture</h2>

      {/* Full CA en gros */}
      <div className="pt-2 text-center">
        <div className="text-slate-400 text-sm">CA total</div>
        {ttcOk ? (
          <div className="text-4xl font-bold mt-1 text-blue-400">
            {calc.full_ca.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </div>
        ) : (
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-500">—</div>
            <div className="text-xs text-amber-400 mt-1">Saisir le TTC dans l&apos;onglet 6 pour afficher le CA total</div>
          </div>
        )}
      </div>

      {/* Récap */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 px-4 py-3">
        <SummaryRow label="Encaissement CB net" value={calc.encaissement_cb_net} />
        <SummaryRow label="CA Cash" value={calc.ca_cash} />
        <SummaryRow label="Mis au coffre" value={form.mis_au_coffre ?? 0} />
        <SummaryRow label="Poire" value={form.poire ?? 0} />
      </div>

      {/* Checklist clôture */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 px-4 py-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-slate-400 text-lg leading-none mt-0.5">☐</span>
          <span className="text-sm text-slate-200">Clôturer le service dans la caisse</span>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-slate-400 text-lg leading-none mt-0.5">☐</span>
          <div>
            <div className="text-sm text-slate-200">Saisir le fond de caisse dans L&apos;Addition</div>
            <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
              {fond.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
