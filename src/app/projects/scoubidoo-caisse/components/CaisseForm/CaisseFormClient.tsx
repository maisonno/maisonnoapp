'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { CaisseFields, Tag, VeilleData, Caisse } from '../../lib/types'
import { computeAll } from '../../lib/formulas'
import { upsertCaisse, fermerCaisse } from '../../actions'
import StepEspeces from './StepEspeces'
import StepRapportX1 from './StepRapportX1'
import StepPayPlus from './StepPayPlus'
import StepSmileAndPay from './StepSmileAndPay'
import StepReglement from './StepReglement'
import StepRepartition from './StepRepartition'
import StepVerification from './StepVerification'

const STEPS = [
  { id: 1, label: 'Espèces' },
  { id: 2, label: 'Rapport X 1' },
  { id: 3, label: 'Pay+' },
  { id: 4, label: 'S&P' },
  { id: 5, label: 'Rapport X 2' },
  { id: 6, label: 'Répartition' },
  { id: 7, label: 'Vérification' },
]

const DRAFT_KEY = 'scoubidoo-caisse-draft'

type Props = {
  tags: Tag[]
  veille: VeilleData | null
  defaultDate: string
  caisseId: string | null
  initialData: Caisse | null
}

function buildInitial(initialData: Caisse | null, veille: VeilleData | null, defaultDate: string): CaisseFields & { date: string; tag_id: string; notes: string } {
  if (initialData) {
    return {
      ...initialData,
      tag_id: initialData.tag_id ?? '',
      notes: initialData.notes ?? '',
    }
  }
  return {
    date: defaultDate,
    tag_id: '',
    notes: '',
    billets_500: 0, billets_200: 0, billets_100: 0, billets_50: 0,
    billets_20: 0, billets_10: 0, billets_5: 0,
    pieces_2: 0, pieces_1: 0, pieces_50c: 0, pieces_20c: 0, pieces_10c: 0,
    fond_caisse_matin: 0,
    sp_cb_jplus1_veille_pourboire_incl: veille?.sp_cb_jplus1_pourboire_incl ?? null,
    sp_pourboire_jplus1_de_la_veille: veille?.sp_pourboire_jplus1 ?? null,
    payplus_jplus1_de_la_veille: veille?.payplus_jplus1 ?? null,
  }
}

export default function CaisseFormClient({ tags, veille, defaultDate, caisseId, initialData }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentId, setCurrentId] = useState<string | null>(caisseId)

  const [form, setForm] = useState<CaisseFields & { date: string; tag_id: string; notes: string }>(() => {
    if (initialData) return buildInitial(initialData, null, defaultDate)
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(DRAFT_KEY)
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return buildInitial(null, veille, defaultDate)
  })

  const calc = computeAll(form)

  useEffect(() => {
    if (initialData) return
    const timer = setInterval(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    }, 10000)
    return () => clearInterval(timer)
  }, [form, initialData])

  const set = useCallback((field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const setNum = useCallback((field: string, value: string) => {
    const parsed = value === '' ? null : parseFloat(value)
    setForm((prev) => ({ ...prev, [field]: parsed }))
  }, [])

  const setInt = useCallback((field: string, value: number) => {
    setForm((prev) => ({ ...prev, [field]: Math.max(0, value) }))
  }, [])

  const saveProgress = useCallback(async () => {
    if (!form.date) return
    setSaving(true)
    setError(null)
    const result = await upsertCaisse(currentId, form as Record<string, unknown>)
    setSaving(false)
    if (result?.error) {
      setError(result.error)
      return false
    }
    if (result?.id && !currentId) {
      setCurrentId(result.id)
      localStorage.removeItem(DRAFT_KEY)
    }
    return true
  }, [form, currentId])

  const goNext = async () => {
    const ok = await saveProgress()
    if (ok) setStep((s) => Math.min(s + 1, 7))
  }

  const goPrev = () => setStep((s) => Math.max(s - 1, 1))

  const handleFermer = async () => {
    const ok = await saveProgress()
    if (!ok || !currentId) return
    const confirm = window.confirm(
      Math.abs(calc.delta) >= 0.01
        ? `⚠️ Le delta est de ${calc.delta.toFixed(2)} €. Fermer quand même ?`
        : 'Fermer la caisse ?'
    )
    if (!confirm) return
    setSaving(true)
    const result = await fermerCaisse(currentId)
    setSaving(false)
    if (result?.error) { setError(result.error); return }
    localStorage.removeItem(DRAFT_KEY)
    router.push('/projects/scoubidoo-caisse')
  }

  const stepProps = { form, set, setNum, setInt, calc }

  return (
    <div className="space-y-4">
      {/* Date + Tag — toujours visibles */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-slate-400 block mb-1">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            className="input"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-slate-400 block mb-1">Tag</label>
          <select
            value={form.tag_id}
            onChange={(e) => set('tag_id', e.target.value)}
            className="input"
          >
            <option value="">—</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex overflow-x-auto border-b border-slate-700 -mb-px">
        {STEPS.map((s) => (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className={`shrink-0 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              step === s.id
                ? 'border-blue-500 text-blue-400'
                : step > s.id
                ? 'border-emerald-700 text-emerald-500'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {s.id}. {s.label}
          </button>
        ))}
      </div>

      {/* Contenu de l'étape */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        {step === 1 && <StepEspeces {...stepProps} />}
        {step === 2 && <StepRapportX1 {...stepProps} />}
        {step === 3 && <StepPayPlus {...stepProps} />}
        {step === 4 && <StepSmileAndPay {...stepProps} />}
        {step === 5 && <StepReglement {...stepProps} />}
        {step === 6 && <StepRepartition {...stepProps} />}
        {step === 7 && <StepVerification {...stepProps} />}
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 1 && (
          <button onClick={goPrev} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:border-slate-600 transition-colors">
            ← Précédent
          </button>
        )}
        {step < 7 ? (
          <button
            onClick={goNext}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? 'Sauvegarde…' : 'Suivant →'}
          </button>
        ) : (
          <button
            onClick={handleFermer}
            disabled={saving}
            className={`flex-1 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 ${
              Math.abs(calc.delta) < 0.01
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {saving ? 'Sauvegarde…' : '🔒 Fermer la caisse'}
          </button>
        )}
      </div>
    </div>
  )
}
