'use client'

import { useState } from 'react'
import type { CaisseFields } from '../../lib/types'
import { computeAll } from '../../lib/formulas'
import { importSmileAndPay } from '../../actions'

type Props = {
  form: CaisseFields & { date: string }
  setNum: (field: string, value: string) => void
  calc: ReturnType<typeof computeAll>
}

function CBRow({ label, cbField, cbValue, pourField, pourValue, onChange, badge }: {
  label: string
  cbField: string; cbValue: number | null | undefined
  pourField: string; pourValue: number | null | undefined
  onChange: (field: string, v: string) => void
  badge?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-300 flex-1">{label}</span>
        {badge}
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <div className="text-[10px] text-slate-500 mb-0.5">Encaissement (pourboire inclus)</div>
          <div className="flex items-center gap-1">
            <input type="number" inputMode="decimal" step="0.01"
              value={cbValue ?? ''}
              onChange={(e) => onChange(cbField, e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-right text-sm font-mono focus:outline-none focus:border-blue-500"
              placeholder="0,00"
            />
            <span className="text-xs text-slate-500">€</span>
          </div>
        </div>
        <div className="w-28">
          <div className="text-[10px] text-slate-500 mb-0.5">Pourboire</div>
          <div className="flex items-center gap-1">
            <input type="number" inputMode="decimal" step="0.01"
              value={pourValue ?? ''}
              onChange={(e) => onChange(pourField, e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-right text-sm font-mono focus:outline-none focus:border-blue-500"
              placeholder="0,00"
            />
            <span className="text-xs text-slate-500">€</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function CalcRow({ label, value, highlight, delta }: { label: string; value: number; highlight?: boolean; delta?: boolean }) {
  const ok = delta ? Math.abs(value) < 0.01 : false
  return (
    <div className="flex justify-between items-center py-1 border-b border-slate-800 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-mono font-semibold ${
        delta ? (ok ? 'text-emerald-400' : value > 0 ? 'text-blue-400' : 'text-red-400')
              : highlight ? 'text-blue-400' : 'text-slate-200'
      }`}>
        {value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
      </span>
    </div>
  )
}

export default function StepCB({ form, setNum, calc }: Props) {
  const [showAutre, setShowAutre] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const handleImport = async () => {
    if (!form.date) {
      setImportStatus({ ok: false, msg: 'Définissez d\'abord la date du service.' })
      return
    }
    setImporting(true)
    setImportStatus(null)
    const result = await importSmileAndPay(form.date)
    setImporting(false)

    if (result.error) {
      setImportStatus({ ok: false, msg: result.error })
      return
    }

    const jCount = result.j_count ?? 0
    const jPlus1Count = result.jplus1_count ?? 0

    if (jCount === 0 && jPlus1Count === 0) {
      setImportStatus({ ok: false, msg: `Aucune transaction S&P trouvée pour le ${form.date}.` })
      return
    }

    const fmt = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
    setNum('sp_cb_j_pourboire_incl', String(result.sp_cb_j_pourboire_incl ?? 0))
    setNum('sp_pourboire_j', String(result.sp_pourboire_j ?? 0))
    setNum('sp_cb_jplus1_pourboire_incl', String(result.sp_cb_jplus1_pourboire_incl ?? 0))
    setNum('sp_pourboire_jplus1', String(result.sp_pourboire_jplus1 ?? 0))
    setImportStatus({
      ok: true,
      msg: `J : ${jCount} tx → ${fmt(result.sp_cb_j_pourboire_incl ?? 0)} (dont ${fmt(result.sp_pourboire_j ?? 0)} pourboire) | J+1 : ${jPlus1Count} tx → ${fmt(result.sp_cb_jplus1_pourboire_incl ?? 0)}`,
    })
  }

  const prefillBadge = (
    <span className="text-[10px] text-emerald-500 bg-emerald-950/40 px-1.5 py-0.5 rounded shrink-0">
      pré-rempli
    </span>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Encaissements CB</h2>
        <button
          type="button"
          onClick={handleImport}
          disabled={importing}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {importing ? (
            <>
              <span className="animate-spin text-base">⟳</span>
              Chargement…
            </>
          ) : (
            <>
              ↓ Importer S&amp;P
            </>
          )}
        </button>
      </div>

      {importStatus && (
        <div className={`rounded-xl px-4 py-2.5 text-sm border ${
          importStatus.ok
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
            : 'bg-red-950/40 border-red-800 text-red-300'
        }`}>
          {importStatus.msg}
        </div>
      )}

      {/* S&P */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-slate-300">Smile &amp; Pay</h3>
        <CBRow
          label="J — Service du soir"
          cbField="sp_cb_j_pourboire_incl" cbValue={form.sp_cb_j_pourboire_incl}
          pourField="sp_pourboire_j" pourValue={form.sp_pourboire_j}
          onChange={setNum}
        />
        <CBRow
          label="J+1 — De minuit à la fermeture (hier soir)"
          cbField="sp_cb_jplus1_veille_pourboire_incl" cbValue={form.sp_cb_jplus1_veille_pourboire_incl}
          pourField="sp_pourboire_jplus1_de_la_veille" pourValue={form.sp_pourboire_jplus1_de_la_veille}
          onChange={setNum}
          badge={form.sp_cb_jplus1_veille_pourboire_incl != null ? prefillBadge : undefined}
        />
        <CBRow
          label="J+1 — De minuit à la fermeture (ce soir)"
          cbField="sp_cb_jplus1_pourboire_incl" cbValue={form.sp_cb_jplus1_pourboire_incl}
          pourField="sp_pourboire_jplus1" pourValue={form.sp_pourboire_jplus1}
          onChange={setNum}
        />
      </section>

      {/* Autre service CB (collapsible) */}
      <section className="pt-3 border-t border-slate-700">
        <button
          type="button"
          onClick={() => setShowAutre(!showAutre)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span className={`transition-transform ${showAutre ? 'rotate-90' : ''}`}>▶</span>
          Autre service CB {showAutre ? '' : '(masqué)'}
        </button>
        {showAutre && (
          <div className="space-y-4 mt-4">
            <CBRow
              label="J — Service du soir"
              cbField="autre_cb_j_pourboire_incl" cbValue={form.autre_cb_j_pourboire_incl}
              pourField="autre_pourboire_j" pourValue={form.autre_pourboire_j}
              onChange={setNum}
            />
            <CBRow
              label="J+1 — De minuit à la fermeture (hier soir)"
              cbField="autre_cb_jplus1_veille_pourboire_incl" cbValue={form.autre_cb_jplus1_veille_pourboire_incl}
              pourField="autre_pourboire_jplus1_de_la_veille" pourValue={form.autre_pourboire_jplus1_de_la_veille}
              onChange={setNum}
              badge={form.autre_cb_jplus1_veille_pourboire_incl != null ? prefillBadge : undefined}
            />
            <CBRow
              label="J+1 — De minuit à la fermeture (ce soir)"
              cbField="autre_cb_jplus1_pourboire_incl" cbValue={form.autre_cb_jplus1_pourboire_incl}
              pourField="autre_pourboire_jplus1" pourValue={form.autre_pourboire_jplus1}
              onChange={setNum}
            />
          </div>
        )}
      </section>

      {/* Calculs */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 px-4 py-3 space-y-0">
        <CalcRow label="Encaissement CB (pourboire inclus)" value={calc.encaissement_cb} />
        <CalcRow label="Pourboire CB" value={calc.pourboire_cb} />
        <CalcRow label="Encaissement CB net" value={calc.encaissement_cb_net} highlight />
        <CalcRow label="CA CB (net − différés)" value={calc.ca_cb} highlight />
        <CalcRow label="Delta CB v1" value={calc.delta_cb_v1} delta />
      </div>
    </div>
  )
}
