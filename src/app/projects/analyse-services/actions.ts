'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const PATHS = [
  '/projects/analyse-services',
  '/projects/analyse-services/detail',
  '/projects/analyse-services/import',
]

export type ActionState = { error?: string; success?: string }

function revalidate() {
  for (const p of PATHS) revalidatePath(p)
}

const numOrNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim().replace(',', '.')
  if (!s) return null
  const n = parseFloat(s)
  return isFinite(n) ? n : null
}
const strOrNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim()
  return s || null
}

// ─── Contrats ───

export async function saveContrat(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const id = strOrNull(formData.get('id'))
  const nom = String(formData.get('nom_affichage') ?? '').trim()
  if (!nom) return { error: 'Le nom du salarié est obligatoire.' }

  const row = {
    nom_affichage: nom,
    poste: strOrNull(formData.get('poste')),
    contrat: strOrNull(formData.get('contrat')),
    employe_hash: strOrNull(formData.get('employe_hash')),
    date_debut: strOrNull(formData.get('date_debut')),
    date_fin: strOrNull(formData.get('date_fin')),
    heures_hebdo_contrat: numOrNull(formData.get('heures_hebdo_contrat')),
    salaire_brut_mensuel: numOrNull(formData.get('salaire_brut_mensuel')),
    heures_hebdo_cible: numOrNull(formData.get('heures_hebdo_cible')),
    actif: formData.get('actif') !== 'false',
  }

  const { error } = id
    ? await supabase.from('ana_contrats').update(row).eq('id', id)
    : await supabase.from('ana_contrats').insert(row)

  if (error) return { error: error.message }
  revalidate()
  return { success: id ? 'Contrat mis à jour.' : 'Contrat ajouté.' }
}

export async function deleteContrat(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const id = strOrNull(formData.get('id'))
  if (!id) return { error: 'Contrat introuvable.' }
  const { error } = await supabase.from('ana_contrats').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidate()
  return { success: 'Contrat supprimé.' }
}

// ─── Complément de rémunération « Poire » (cash, hors charges) ───

export async function saveRemunerationPoire(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient()
  const contrat_id = strOrNull(formData.get('contrat_id'))
  const mois = strOrNull(formData.get('mois')) // 'YYYY-MM'
  const montant = numOrNull(formData.get('montant')) ?? 0
  if (!contrat_id || !mois) return { error: 'Salarié et mois obligatoires.' }
  const moisDate = `${mois.slice(0, 7)}-01`

  if (montant === 0) {
    const { error } = await supabase
      .from('ana_remuneration_poire')
      .delete()
      .eq('contrat_id', contrat_id)
      .eq('mois', moisDate)
    if (error) return { error: error.message }
    revalidate()
    return { success: 'Complément retiré.' }
  }

  const { error } = await supabase
    .from('ana_remuneration_poire')
    .upsert({ contrat_id, mois: moisDate, montant }, { onConflict: 'contrat_id,mois' })
  if (error) return { error: error.message }
  revalidate()
  return { success: 'Complément enregistré.' }
}

// ─── Import de la Poire depuis la mini-app Scoubidoo ───
// Lit directement la vue `scd_v_caisse_calc` (même source que l'export CSV de
// scoubidoo-caisse) et upserte dans `ana_poire_daily` : plus besoin de passer
// par un CSV. Idempotent (PK = jour), plusieurs services d'un même jour sommés.

type CaisseRow = { date: string; poire: number | null; tag_name: string | null }

export async function importPoireFromScoubidoo(): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { data, error } = await supabase
    .from('scd_v_caisse_calc')
    .select('date,poire,tag_name')
    .order('date', { ascending: true })
  if (error) return { error: `Lecture Scoubidoo : ${error.message}` }

  const rows = (data as unknown as CaisseRow[]) ?? []
  const byDay: Record<string, { montant: number; tag: string | null }> = {}
  for (const r of rows) {
    const montant = Number(r.poire) || 0
    if (!r.date || !montant) continue
    const cur = (byDay[r.date] ||= { montant: 0, tag: null })
    cur.montant += montant
    if (!cur.tag && r.tag_name) cur.tag = r.tag_name
  }

  const poire = Object.entries(byDay).map(([jour, v]) => ({
    jour,
    montant_ttc: v.montant,
    tag: v.tag,
    source_file: 'scoubidoo (base)',
  }))

  if (poire.length === 0) {
    return { error: 'Aucune Poire trouvée dans la caisse Scoubidoo.' }
  }

  for (let i = 0; i < poire.length; i += 500) {
    const { error: e } = await supabase
      .from('ana_poire_daily')
      .upsert(poire.slice(i, i + 500), { onConflict: 'jour' })
    if (e) return { error: `Écriture : ${e.message}` }
  }

  await supabase.from('ana_import_log').insert({
    kind: 'poire',
    file_name: 'scoubidoo (base)',
    rows_in: rows.length,
    poire_upserted: poire.length,
  })

  const total = poire.reduce((s, p) => s + p.montant_ttc, 0)
  revalidate()
  return {
    success: `${poire.length} jour${poire.length > 1 ? 's' : ''} de Poire importé${
      poire.length > 1 ? 's' : ''
    } depuis Scoubidoo — ${total.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    })}.`,
  }
}

// ─── Paramètres ───

export async function saveParam(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const cle = strOrNull(formData.get('cle'))
  const valeur = numOrNull(formData.get('valeur'))
  if (!cle || valeur == null) return { error: 'Paramètre invalide.' }
  const { error } = await supabase
    .from('ana_params')
    .upsert({ cle, valeur }, { onConflict: 'cle' })
  if (error) return { error: error.message }
  revalidate()
  return { success: 'Paramètre enregistré.' }
}
