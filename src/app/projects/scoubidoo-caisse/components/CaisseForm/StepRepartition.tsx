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

function InfoRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-slate-800 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-mono text-slate-200">{value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
    </div>
  )
}

export default function StepRepartition({ form, setNum, calc }: Props) {
  const resteEnCaisse = calc.reste_en_caisse
  const deltaCashv2 = calc.delta_cash_v2

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Répartition du cash</h2>

      {/* Infos */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 px-4 py-3">
        <InfoRow label="Total tiroir caisse" value={calc.total_caisse_soir} />
        <InfoRow label="Pourboire CB" value={calc.pourboire_cb} />
        <InfoRow label="Trop perçu" value={form.reglement_service_trop_percu_cb ?? 0} />
        <div className="flex justify-between items-center pt-2">
          <span className="text-sm text-slate-400">Delta Cash v2</span>
          <span className={`text-sm font-mono font-semibold ${
            Math.abs(deltaCashv2) < 0.01 ? 'text-emerald-400' : deltaCashv2 > 0 ? 'text-blue-400' : 'text-red-400'
          }`}>
            {deltaCashv2 >= 0 ? '+' : ''}{deltaCashv2.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      </div>

      {/* Saisie */}
      <section className="space-y-1 pt-1">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Affecter</h3>
        <Row label="Poire" value={form.poire} onChange={(v) => setNum('poire', v)} hint="Versement à la Poire" />
        <Row label="Pomme (Coffre)" value={form.mis_au_coffre} onChange={(v) => setNum('mis_au_coffre', v)} hint="Mise au coffre La Pomme" />
        <Row label="Versement pourboire" value={form.pourboire_tpe_verse_au_pourboire} onChange={(v) => setNum('pourboire_tpe_verse_au_pourboire', v)} />
      </section>

      {/* Reste en caisse */}
      <div className={`rounded-2xl p-5 border text-center ${
        Math.abs(resteEnCaisse) < 0.01 ? 'bg-slate-800/50 border-slate-700' : 'bg-blue-950/40 border-blue-700'
      }`}>
        <div className="text-xs text-slate-400 mb-1">Reste en caisse</div>
        <div className="text-4xl font-bold font-mono text-blue-400">
          {resteEnCaisse.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </div>
        <div className="text-xs text-slate-500 mt-1">Tiroir − Poire − Pomme − Pourboire</div>
      </div>
    </div>
  )
}
