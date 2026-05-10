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

export default function StepRepartition({ form, setNum, calc }: Props) {
  const delta = calc.delta
  const deltaOk = Math.abs(delta) < 0.01

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Répartition du cash</h2>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Destination du cash</h3>

        <NumField label="Mis au coffre"
          value={form.mis_au_coffre} onChange={(v) => setNum('mis_au_coffre', v)} />

        <NumField label="Poire"
          value={form.poire} onChange={(v) => setNum('poire', v)}
          hint="Versement au fonds Poire" />

        <NumField label="Ajout monnaie"
          value={form.ajout_monnaie} onChange={(v) => setNum('ajout_monnaie', v)}
          hint="Monnaie ajoutée depuis l'extérieur (signe +)" />

        <NumField label="Fond de caisse soir"
          value={form.fond_caisse_soir} onChange={(v) => setNum('fond_caisse_soir', v)}
          hint="Montant laissé en caisse pour le lendemain" />
      </section>

      <section className="space-y-4 pt-3 border-t border-slate-700">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Pourboires versés</h3>

        <NumField label="Pourboire TPE versé"
          value={form.pourboire_tpe_verse_au_pourboire} onChange={(v) => setNum('pourboire_tpe_verse_au_pourboire', v)} />

        <NumField label="Trop perçu versé"
          value={form.trop_percu_verse_au_pourboire} onChange={(v) => setNum('trop_percu_verse_au_pourboire', v)} />

        <div className="text-xs text-slate-500">
          Pourboire TPE total dispo : {calc.pourboire_tpe.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </div>
      </section>

      {/* Delta */}
      <div className={`rounded-2xl p-5 border ${deltaOk ? 'bg-emerald-950/50 border-emerald-700' : 'bg-red-950/50 border-red-700'}`}>
        <div className="text-center">
          <div className="text-sm text-slate-400 mb-1">Delta caisse</div>
          <div className={`text-4xl font-bold ${deltaOk ? 'text-emerald-400' : 'text-red-400'}`}>
            {delta.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {deltaOk ? 'Tout est équilibré' : 'Vérifier les montants ci-dessus'}
          </div>
        </div>
      </div>

      <section className="space-y-4 pt-3 border-t border-slate-700">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Comptes clients</h3>

        <NumField label="Paiement compte CB"
          value={form.paiement_compte_cb} onChange={(v) => setNum('paiement_compte_cb', v)} />

        <NumField label="Paiement compte cash"
          value={form.paiement_compte_cash} onChange={(v) => setNum('paiement_compte_cash', v)} />

        <NumField label="Écart CB"
          value={form.ecart_cb} onChange={(v) => setNum('ecart_cb', v)} />

        <NumField label="Écart cash"
          value={form.ecart_cash} onChange={(v) => setNum('ecart_cash', v)} />

        <NumField label="Mouvement monnaie"
          value={form.mouvement_monnaie} onChange={(v) => setNum('mouvement_monnaie', v)}
          hint="Bons de monnaie remis au commerce" />
      </section>
    </div>
  )
}
