'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const PATHS = ['/projects/analyse-services', '/projects/analyse-services/detail']

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
