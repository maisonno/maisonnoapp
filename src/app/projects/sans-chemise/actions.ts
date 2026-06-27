'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionState } from './lib/types'

// -------------------------------------------------------------
// Modèles
// -------------------------------------------------------------

// Génère / synchronise les articles (modèle × variante × taille).
// Crée les combinaisons manquantes (ou les réactive), désactive
// celles qui ne sont plus dans le modèle (sans les supprimer pour
// préserver l'historique des ventes).
async function syncArticles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  modeleId: string,
  variantes: string[],
  tailles: string[],
) {
  const { data: existing } = await supabase
    .from('snc_articles')
    .select('id, variante, taille')
    .eq('modele_id', modeleId)

  const existingMap = new Map<string, string>() // "variante|taille" -> id
  for (const a of existing ?? []) existingMap.set(`${a.variante}|${a.taille}`, a.id)

  const wanted = new Set<string>()
  const toInsert: { modele_id: string; variante: string; taille: string }[] = []
  const toActivate: string[] = []

  for (const variante of variantes) {
    for (const taille of tailles) {
      const key = `${variante}|${taille}`
      wanted.add(key)
      const id = existingMap.get(key)
      if (id) toActivate.push(id)
      else toInsert.push({ modele_id: modeleId, variante, taille })
    }
  }

  const toDeactivate: string[] = []
  for (const [key, id] of existingMap) if (!wanted.has(key)) toDeactivate.push(id)

  if (toInsert.length) await supabase.from('snc_articles').insert(toInsert)
  if (toActivate.length) await supabase.from('snc_articles').update({ actif: true }).in('id', toActivate)
  if (toDeactivate.length) await supabase.from('snc_articles').update({ actif: false }).in('id', toDeactivate)
}

type ModeleInput = {
  nom: string
  variantes: string[]
  tailles: string[]
  // Prix par variante (€)
  prixVariantes: Record<string, number>
  // Variantes « phares »
  variantesPhares: string[]
}

function parseModele(
  data: ModeleInput,
): { error?: string; nom?: string; prix?: number; prixVariantes?: Record<string, number>; variantesPhares?: string[] } {
  const nom = data.nom.trim()
  if (!nom) return { error: 'Le nom est requis' }
  if (data.variantes.length === 0) return { error: 'Sélectionne au moins une variante' }
  if (data.tailles.length === 0) return { error: 'Sélectionne au moins une taille' }

  const prixVariantes: Record<string, number> = {}
  for (const v of data.variantes) {
    const raw = data.prixVariantes?.[v]
    const n = raw === undefined || raw === null ? 0 : Number(raw)
    if (Number.isNaN(n) || n < 0) return { error: `Prix invalide pour « ${v} »` }
    prixVariantes[v] = n
  }
  // Prix de base = prix le plus bas (sert de repli / d'affichage)
  const prix = Math.min(...Object.values(prixVariantes))
  // Phares limitées aux variantes sélectionnées
  const variantesPhares = (data.variantesPhares ?? []).filter((v) => data.variantes.includes(v))
  return { nom, prix, prixVariantes, variantesPhares }
}

export async function createModele(data: ModeleInput): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const parsed = parseModele(data)
  if (parsed.error) return { error: parsed.error }

  const { data: modele, error } = await supabase
    .from('snc_modeles')
    .insert({
      nom: parsed.nom,
      prix: parsed.prix,
      prix_variantes: parsed.prixVariantes,
      variantes_phares: parsed.variantesPhares,
      variantes: data.variantes,
      tailles: data.tailles,
    })
    .select('id')
    .single()

  if (error || !modele) return { error: error?.message ?? 'Création impossible' }

  await syncArticles(supabase, modele.id, data.variantes, data.tailles)
  return { success: true }
}

export async function updateModele(id: string, data: ModeleInput): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const parsed = parseModele(data)
  if (parsed.error) return { error: parsed.error }

  const { error } = await supabase
    .from('snc_modeles')
    .update({
      nom: parsed.nom,
      prix: parsed.prix,
      prix_variantes: parsed.prixVariantes,
      variantes_phares: parsed.variantesPhares,
      variantes: data.variantes,
      tailles: data.tailles,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  await syncArticles(supabase, id, data.variantes, data.tailles)
  return { success: true }
}

// Marque/démarque une variante d'un modèle comme « phare » (action rapide)
export async function setVariantePhare(id: string, variante: string, phare: boolean): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: modele } = await supabase
    .from('snc_modeles')
    .select('variantes_phares')
    .eq('id', id)
    .single()

  const current: string[] = modele?.variantes_phares ?? []
  const next = phare
    ? Array.from(new Set([...current, variante]))
    : current.filter((v) => v !== variante)

  const { error } = await supabase.from('snc_modeles').update({ variantes_phares: next }).eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function setModeleActif(id: string, actif: boolean): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.from('snc_modeles').update({ actif }).eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteModele(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.from('snc_modeles').delete().eq('id', id)
  if (error) {
    return { error: 'Modèle utilisé par des ventes : désactive-le plutôt que de le supprimer.' }
  }
  return { success: true }
}

// -------------------------------------------------------------
// Ventes
// -------------------------------------------------------------

type VenteInput = {
  date: string
  article_id: string
  quantite: number
  prix_unitaire: string
  mode_paiement: 'cb' | 'especes'
  notes: string
}

function parseVente(
  data: VenteInput,
): { error?: string; prix?: number; quantite?: number; mode_paiement?: 'cb' | 'especes' } {
  if (!data.article_id) return { error: 'Article manquant' }
  const quantite = Math.round(Number(data.quantite))
  if (!quantite || quantite < 1) return { error: 'Quantité invalide' }
  const prix = parseFloat(data.prix_unitaire)
  if (isNaN(prix) || prix < 0) return { error: 'Prix invalide' }
  const mode_paiement = data.mode_paiement === 'especes' ? 'especes' : 'cb'
  return { prix, quantite, mode_paiement }
}

export async function createVente(data: VenteInput): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const parsed = parseVente(data)
  if (parsed.error) return { error: parsed.error }

  const { error } = await supabase.from('snc_ventes').insert({
    date: data.date,
    article_id: data.article_id,
    quantite: parsed.quantite,
    prix_unitaire: parsed.prix,
    mode_paiement: parsed.mode_paiement,
    notes: data.notes.trim() || null,
    created_by: user.id,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function updateVente(id: string, data: VenteInput): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const parsed = parseVente(data)
  if (parsed.error) return { error: parsed.error }

  const { error } = await supabase.from('snc_ventes').update({
    date: data.date,
    article_id: data.article_id,
    quantite: parsed.quantite,
    prix_unitaire: parsed.prix,
    mode_paiement: parsed.mode_paiement,
    notes: data.notes.trim() || null,
  }).eq('id', id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteVente(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.from('snc_ventes').delete().eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

// -------------------------------------------------------------
// Mouvements d'inventaire (réception / retrait)
// -------------------------------------------------------------

type MouvementInput = {
  date: string
  article_id: string
  quantite: number
  sens: 'reception' | 'retrait'
  motif: string
}

export async function createMouvement(data: MouvementInput): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  if (!data.article_id) return { error: 'Article manquant' }
  const quantite = Math.round(Number(data.quantite))
  if (!quantite || quantite < 1) return { error: 'Quantité invalide' }

  const { error } = await supabase.from('snc_mouvements').insert({
    date: data.date,
    article_id: data.article_id,
    quantite,
    sens: data.sens,
    motif: data.motif.trim() || null,
    created_by: user.id,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteMouvement(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.from('snc_mouvements').delete().eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}
