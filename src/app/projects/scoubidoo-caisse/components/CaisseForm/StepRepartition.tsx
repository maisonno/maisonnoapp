'use client'

import { useEffect } from 'react'
import type { CaisseFields } from '../../lib/types'
import { computeAll } from '../../lib/formulas'

type Props = {
  form: CaisseFields
  setNum: (field: string, value: string) => void
  setInt: (field: string, value: number) => void
  calc: ReturnType<typeof computeAll>
}

function StepBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-lg font-bold transition-colors shrink-0 flex items-center justify-center"
    >
      {children}
    </button>
  )
}

const DENOMS: { caisseKey: keyof CaisseFields; fondKey: keyof CaisseFields; label: string; val: number }[] = [
  { caisseKey: 'billets_500', fondKey: 'fond_billets_500', label: '500 €', val: 500 },
  { caisseKey: 'billets_200', fondKey: 'fond_billets_200', label: '200 €', val: 200 },
  { caisseKey: 'billets_100', fondKey: 'fond_billets_100', label: '100 €', val: 100 },
  { caisseKey: 'billets_50',  fondKey: 'fond_billets_50',  label: '50 €',  val: 50  },
  { caisseKey: 'billets_20',  fondKey: 'fond_billets_20',  label: '20 €',  val: 20  },
  { caisseKey: 'billets_10',  fondKey: 'fond_billets_10',  label: '10 €',  val: 10  },
  { caisseKey: 'billets_5',   fondKey: 'fond_billets_5',   label: '5 €',   val: 5   },
  { caisseKey: 'pieces_2',   fondKey: 'fond_pieces_2',   label: '2 €',   val: 2   },
  { caisseKey: 'pieces_1',   fondKey: 'fond_pieces_1',   label: '1 €',   val: 1   },
  { caisseKey: 'pieces_50c', fondKey: 'fond_pieces_50c', label: '0,50',  val: 0.5  },
  { caisseKey: 'pieces_20c', fondKey: 'fond_pieces_20c', label: '0,20',  val: 0.2  },
  { caisseKey: 'pieces_10c', fondKey: 'fond_pieces_10c', label: '0,10',  val: 0.1  },
]

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

export default function StepRepartition({ form, setNum, setInt, calc }: Props) {
  function handleFondChange(fondKey: string, val: number) {
    const newVal = Math.max(0, val)
    setInt(fondKey, newVal)
    // Recalcule fond_caisse_soir
    const total = Math.round(
      DENOMS.reduce((acc, d) => {
        const qty = d.fondKey === fondKey ? newVal : ((form[d.fondKey] as number) ?? 0)
        return acc + qty * d.val
      }, 0) * 100
    ) / 100
    setNum('fond_caisse_soir', String(total))
  }

  // Pre-fill fond coupures from espèces on first open (if no fond value set yet)
  useEffect(() => {
    const anyFondSet = DENOMS.some(d => ((form[d.fondKey] as number) ?? 0) > 0)
    if (anyFondSet) return
    DENOMS.forEach(d => setInt(String(d.fondKey), (form[d.caisseKey] as number) ?? 0))
    const total = Math.round(
      DENOMS.reduce((acc, d) => acc + ((form[d.caisseKey] as number) ?? 0) * d.val, 0) * 100
    ) / 100
    setNum('fond_caisse_soir', String(total))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fondTotal = Math.round(
    DENOMS.reduce((acc, d) => acc + ((form[d.fondKey] as number) ?? 0) * d.val, 0) * 100
  ) / 100

  const resteEnCaisse = calc.reste_en_caisse
  const deltaCashv2 = calc.delta_cash_v2
  const delta = calc.delta_cloture
  const ok = Math.abs(delta) < 0.01

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

      {/* Affecter */}
      <section className="space-y-1">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Affecter</h3>
        <Row label="Poire" value={form.poire} onChange={(v) => setNum('poire', v)} hint="Versement à la Poire" />
        <Row label="Pomme (Coffre)" value={form.mis_au_coffre} onChange={(v) => setNum('mis_au_coffre', v)} hint="Mise au coffre La Pomme" />
        <Row label="Versement pourboire" value={form.pourboire_tpe_verse_au_pourboire} onChange={(v) => setNum('pourboire_tpe_verse_au_pourboire', v)} />
        <Row label="Ajout monnaie" value={form.ajout_monnaie} onChange={(v) => setNum('ajout_monnaie', v)} hint="Appoint pour compléter le fond" />
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

      {/* Fond de caisse — tableau */}
      <section className="pt-1">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Fond de caisse</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left pb-1.5 text-xs text-slate-500 font-normal">Dénom.</th>
              <th className="text-center pb-1.5 text-xs text-slate-500 font-normal">En caisse</th>
              <th className="text-center pb-1.5 text-xs text-slate-500 font-normal">Fond</th>
            </tr>
          </thead>
          <tbody>
            {DENOMS.map((d) => {
              const caisseQty = (form[d.caisseKey] as number) ?? 0
              const fondQty = (form[d.fondKey] as number) ?? 0
              return (
                <tr key={String(d.fondKey)} className="border-b border-slate-800/50">
                  <td className="py-1.5 text-slate-400 pr-2">{d.label}</td>
                  <td className="py-1.5 text-center font-mono text-slate-300">{caisseQty}</td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-1">
                      <StepBtn onClick={() => handleFondChange(String(d.fondKey), fondQty - 1)}>−</StepBtn>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={fondQty === 0 ? '' : fondQty}
                        onChange={(e) => handleFondChange(String(d.fondKey), parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-12 bg-slate-800 border border-slate-600 rounded-lg px-1 py-2 text-center text-sm font-mono font-semibold focus:outline-none focus:border-blue-500"
                      />
                      <StepBtn onClick={() => handleFondChange(String(d.fondKey), fondQty + 1)}>+</StepBtn>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {/* Fond calculé */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700">
        <div>
          <div className="text-sm text-slate-300">Fond de caisse L&apos;Addition</div>
          <div className="text-xs text-slate-500">Calculé depuis les coupures ci-dessus</div>
        </div>
        <div className="font-mono font-semibold text-lg text-slate-200">
          {fondTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </div>
      </div>

      {/* Vérification */}
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
