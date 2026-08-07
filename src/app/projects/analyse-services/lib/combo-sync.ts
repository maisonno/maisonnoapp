// Synchronisation ComboHR → tables `ana_` (remplace l'import fichier).
// Exécuté côté serveur uniquement (appelé depuis actions.ts).

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  effectiveContract,
  getContractHistory,
  getContracts,
  getPastContracts,
  getPlannings,
  isoWeekKey,
  shiftHours,
  type ComboContract,
  type ComboPlanning,
} from './combo'
import { majoredHours } from './labor'

export type SyncReport = {
  locationName: string
  annee: string
  contrats: number
  contratsSansSalaire: number
  contratsSansFin: number
  shifts: number
  moisAvecHeures: number
  heuresReelles: number
  heuresPlanifiees: number
}

const monthsOf = (year: string) =>
  Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)

const lastDay = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return `${ym}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`
}

const fullName = (c: ComboContract) =>
  `${c.firstname ?? ''} ${c.lastname ?? ''}`.trim() || `Contrat ${c.id}`

// Identité stable d'un contrat (les avenants partagent l'original)
const lineageId = (c: ComboContract) => c.original_contract_id || c.id

export async function syncCombo(
  supabase: SupabaseClient,
  locationId: string,
  locationName: string,
  annee: string,
): Promise<SyncReport> {
  const months = monthsOf(annee)

  // ─── 1. Contrats : actifs au 15 de chaque mois + contrats terminés dans l'année
  const byLineage = new Map<string, ComboContract>()
  const aliasToLineage = new Map<string, string>()

  // Fusion prudente : une valeur nulle ne doit jamais écraser une valeur connue
  const merge = (prev: ComboContract | undefined, next: ComboContract): ComboContract => {
    if (!prev) return { ...next }
    const out: ComboContract & Record<string, unknown> = { ...prev }
    for (const [k, v] of Object.entries(next)) {
      if (v != null) out[k] = v
    }
    // La période du contrat est celle de l'original, pas celle d'un avenant :
    // on garde le début le plus tôt et la fin la plus tardive.
    if (prev.start_date && next.start_date) {
      out.start_date = prev.start_date < next.start_date ? prev.start_date : next.start_date
    }
    if (prev.end_date && next.end_date) {
      out.end_date = prev.end_date > next.end_date ? prev.end_date : next.end_date
    }
    return out
  }

  const collect = (list: ComboContract[]) => {
    for (const c of list) {
      const key = lineageId(c)
      byLineage.set(key, merge(byLineage.get(key), c))
      aliasToLineage.set(c.id, key)
      if (c.original_contract_id) aliasToLineage.set(c.original_contract_id, key)
    }
  }

  for (const ym of months) {
    collect(await getContracts(locationId, `${ym}-15`))
  }
  collect(await getPastContracts(locationId, `${annee}-01-01`, `${annee}-12-31`))

  // Contrat effectif : l'historique donne la vraie période après avenants
  // (un avenant permanent laisse end_date à null, la fin réelle est dans `changes`).
  for (const key of [...byLineage.keys()]) {
    try {
      const hist = await getContractHistory(key)
      if (!hist) continue
      const eff = effectiveContract(hist)
      // L'historique fait autorité sur la période (un avenant peut aussi la
      // raccourcir) : on écrase les dates plutôt que d'appliquer min/max.
      const merged = merge(byLineage.get(key), eff)
      if (eff.start_date) merged.start_date = eff.start_date
      if (eff.end_date) merged.end_date = eff.end_date
      byLineage.set(key, merged)
    } catch {
      // Historique indisponible : on conserve la fusion issue des listes
    }
  }

  // ─── 2. Upsert des contrats
  const rows = [...byLineage.entries()].map(([key, c]) => ({
    combo_contract_id: key,
    nom_affichage: fullName(c),
    poste: c.function ?? null,
    contrat: c.contract_type ?? null,
    date_debut: c.start_date ?? null,
    date_fin: c.end_date ?? null,
    heures_hebdo_contrat: c.contract_time ?? null,
    salaire_brut_mensuel: c.monthly_gross_salary ?? null,
    synced_at: new Date().toISOString(),
  }))

  if (rows.length > 0) {
    const { error } = await supabase
      .from('ana_contrats')
      .upsert(rows, { onConflict: 'combo_contract_id' })
    if (error) throw new Error(`Écriture des contrats : ${error.message}`)
  }

  // Récupère les identifiants internes pour lier les heures
  const { data: contratRows, error: cErr } = await supabase
    .from('ana_contrats')
    .select('id,combo_contract_id')
    .not('combo_contract_id', 'is', null)
  if (cErr) throw new Error(`Relecture des contrats : ${cErr.message}`)
  const idByLineage = new Map<string, string>()
  for (const r of (contratRows as { id: string; combo_contract_id: string }[]) ?? []) {
    idByLineage.set(r.combo_contract_id, r.id)
  }

  // ─── 3. Plannings mois par mois
  const shifts: ComboPlanning[] = []
  for (const ym of months) {
    const batch = await getPlannings(`${ym}-01`, lastDay(ym), locationId)
    shifts.push(...batch)
  }

  // ─── 4. Heures par contrat × semaine (pour le barème d'heures supp) puis mois
  type WeekAcc = { reel: number; prev: number }
  const perWeek = new Map<string, WeekAcc>() // `${lineage}|${weekKey}`
  const monthHours = new Map<string, { reel: number; prev: number }>() // `${lineage}|${ym}`

  for (const s of shifts) {
    const alias = s.contract_id ?? ''
    const lineage = aliasToLineage.get(alias) ?? alias
    if (!lineage) continue
    const day = (s.date ?? s.starts_at ?? '').slice(0, 10)
    if (!day.startsWith(annee)) continue

    const prev = shiftHours(s, false)
    const reelRaw = shiftHours(s, true)
    // Pas de pointage → on ne compte pas d'heures réelles pour ce shift
    const reel = s.real_starts_at && s.real_ends_at ? reelRaw : 0

    const wk = `${lineage}|${isoWeekKey(day)}`
    const w = perWeek.get(wk) ?? { reel: 0, prev: 0 }
    w.reel += reel
    w.prev += prev
    perWeek.set(wk, w)

    const mk = `${lineage}|${day.slice(0, 7)}`
    const m = monthHours.get(mk) ?? { reel: 0, prev: 0 }
    m.reel += reel
    m.prev += prev
    monthHours.set(mk, m)
  }

  // Majoration heures supp, semaine par semaine, rattachée au mois du lundi
  const monthSupp = new Map<string, { reel: number; prev: number }>()
  for (const [wk, w] of perWeek) {
    const [lineage, weekStart] = wk.split('|')
    const c = byLineage.get(lineage)
    const contratH = c?.contract_time ?? 0
    if (contratH <= 0) continue
    const mk = `${lineage}|${weekStart.slice(0, 7)}`
    const acc = monthSupp.get(mk) ?? { reel: 0, prev: 0 }
    acc.reel += majoredHours(contratH, w.reel)
    acc.prev += majoredHours(contratH, w.prev)
    monthSupp.set(mk, acc)
  }

  // ─── 5. Upsert des heures mensuelles
  const heuresRows: Record<string, unknown>[] = []
  let totalReel = 0
  let totalPrev = 0
  for (const [mk, h] of monthHours) {
    const [lineage, ym] = mk.split('|')
    const contratId = idByLineage.get(lineage)
    if (!contratId) continue
    const supp = monthSupp.get(mk) ?? { reel: 0, prev: 0 }
    totalReel += h.reel
    totalPrev += h.prev
    heuresRows.push({
      contrat_id: contratId,
      mois: `${ym}-01`,
      heures_reelles: Math.round(h.reel * 100) / 100,
      heures_planifiees: Math.round(h.prev * 100) / 100,
      supp_equiv_reel: Math.round(supp.reel * 100) / 100,
      supp_equiv_planifie: Math.round(supp.prev * 100) / 100,
      synced_at: new Date().toISOString(),
    })
  }

  for (let i = 0; i < heuresRows.length; i += 500) {
    const { error } = await supabase
      .from('ana_heures_mois')
      .upsert(heuresRows.slice(i, i + 500), { onConflict: 'contrat_id,mois' })
    if (error) throw new Error(`Écriture des heures : ${error.message}`)
  }

  return {
    locationName,
    annee,
    contrats: rows.length,
    contratsSansSalaire: rows.filter((r) => r.salaire_brut_mensuel == null).length,
    contratsSansFin: rows.filter((r) => r.date_fin == null).length,
    shifts: shifts.length,
    moisAvecHeures: heuresRows.length,
    heuresReelles: Math.round(totalReel),
    heuresPlanifiees: Math.round(totalPrev),
  }
}
