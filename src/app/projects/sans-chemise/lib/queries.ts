import { createClient } from '@/lib/supabase/server'
import type { Article, Modele, ModeleWithArticles, Mouvement, Vente } from './types'
import { sortTailles, TAILLES } from './constants'

// Normalise la colonne jsonb prix_variantes en map { variante: prix(number) }
function parsePrixVariantes(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(v)
    if (!Number.isNaN(n)) out[k] = n
  }
  return out
}

export async function getModeles(): Promise<Modele[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('snc_modeles')
    .select('id, nom, prix, prix_variantes, variantes_phares, variantes, tailles, actif')
    .order('nom')
  return (data ?? []).map((m) => ({
    id: m.id,
    nom: m.nom,
    prix: Number(m.prix),
    prixVariantes: parsePrixVariantes(m.prix_variantes),
    variantesPhares: m.variantes_phares ?? [],
    variantes: m.variantes ?? [],
    tailles: sortTailles(m.tailles ?? []),
    actif: m.actif,
  }))
}

// Modèles actifs enrichis de leurs articles actifs + stock courant.
// Source principale de l'écran de saisie de vente.
export async function getModelesWithStock(): Promise<ModeleWithArticles[]> {
  const supabase = await createClient()

  const [modelesRes, articlesRes, stockRes] = await Promise.all([
    supabase.from('snc_modeles').select('id, nom, prix, prix_variantes, variantes_phares, variantes, tailles, actif').eq('actif', true).order('nom'),
    supabase.from('snc_articles').select('id, modele_id, variante, taille, actif').eq('actif', true),
    supabase.from('snc_v_stock').select('article_id, stock'),
  ])

  const stockMap = new Map<string, number>()
  for (const row of stockRes.data ?? []) stockMap.set(row.article_id, Number(row.stock))

  // Prix de base + prix par variante + variantes phares de chaque modèle
  const info = new Map<string, { base: number; pv: Record<string, number>; phares: Set<string> }>()
  for (const m of modelesRes.data ?? []) {
    info.set(m.id, {
      base: Number(m.prix),
      pv: parsePrixVariantes(m.prix_variantes),
      phares: new Set<string>(m.variantes_phares ?? []),
    })
  }

  const articlesByModele = new Map<string, Article[]>()
  for (const a of articlesRes.data ?? []) {
    const mi = info.get(a.modele_id)
    const list = articlesByModele.get(a.modele_id) ?? []
    list.push({
      id: a.id,
      modele_id: a.modele_id,
      variante: a.variante,
      taille: a.taille,
      actif: a.actif,
      stock: stockMap.get(a.id) ?? 0,
      prix: mi ? (mi.pv[a.variante] ?? mi.base ?? null) : null,
      phare: mi ? mi.phares.has(a.variante) : false,
    })
    articlesByModele.set(a.modele_id, list)
  }

  return (modelesRes.data ?? []).map((m) => {
    const articles = (articlesByModele.get(m.id) ?? []).sort((a, b) => {
      const va = (m.variantes ?? []).indexOf(a.variante) - (m.variantes ?? []).indexOf(b.variante)
      if (va !== 0) return va
      return TAILLES.indexOf(a.taille as (typeof TAILLES)[number]) - TAILLES.indexOf(b.taille as (typeof TAILLES)[number])
    })
    return {
      id: m.id,
      nom: m.nom,
      prix: Number(m.prix),
      prixVariantes: parsePrixVariantes(m.prix_variantes),
      variantesPhares: m.variantes_phares ?? [],
      variantes: m.variantes ?? [],
      tailles: sortTailles(m.tailles ?? []),
      actif: m.actif,
      articles,
      stockTotal: articles.reduce((s, a) => s + a.stock, 0),
    }
  })
}

// Tous les articles (actifs) avec stock + infos modèle, pour l'écran inventaire
export async function getArticlesWithStock(): Promise<(Article & { modele_nom: string })[]> {
  const supabase = await createClient()
  const [articlesRes, modelesRes, stockRes] = await Promise.all([
    supabase.from('snc_articles').select('id, modele_id, variante, taille, actif').eq('actif', true),
    supabase.from('snc_modeles').select('id, nom, prix, prix_variantes, variantes_phares, variantes').eq('actif', true),
    supabase.from('snc_v_stock').select('article_id, stock'),
  ])

  const stockMap = new Map<string, number>()
  for (const row of stockRes.data ?? []) stockMap.set(row.article_id, Number(row.stock))

  const modeleMap = new Map<string, { nom: string; base: number; pv: Record<string, number>; phares: Set<string> }>()
  for (const m of modelesRes.data ?? []) {
    modeleMap.set(m.id, {
      nom: m.nom,
      base: Number(m.prix),
      pv: parsePrixVariantes(m.prix_variantes),
      phares: new Set<string>(m.variantes_phares ?? []),
    })
  }

  return (articlesRes.data ?? [])
    .filter((a) => modeleMap.has(a.modele_id))
    .map((a) => {
      const info = modeleMap.get(a.modele_id)!
      return {
        id: a.id,
        modele_id: a.modele_id,
        variante: a.variante,
        taille: a.taille,
        actif: a.actif,
        stock: stockMap.get(a.id) ?? 0,
        prix: info.pv[a.variante] ?? info.base ?? null,
        phare: info.phares.has(a.variante),
        modele_nom: info.nom,
      }
    })
    .sort((a, b) => {
      if (a.modele_nom !== b.modele_nom) return a.modele_nom.localeCompare(b.modele_nom)
      if (a.variante !== b.variante) return a.variante.localeCompare(b.variante)
      return TAILLES.indexOf(a.taille as (typeof TAILLES)[number]) - TAILLES.indexOf(b.taille as (typeof TAILLES)[number])
    })
}

type ArticleJoin = {
  variante: string
  taille: string
  snc_modeles: { nom: string } | null
}

export async function getVentes(limit = 100): Promise<Vente[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('snc_ventes')
    .select(`
      id, date, article_id, quantite, prix_unitaire, notes, created_at,
      snc_articles ( variante, taille, snc_modeles ( nom ) )
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((row) => {
    const article = row.snc_articles as unknown as ArticleJoin | null
    return {
      id: row.id,
      date: row.date,
      article_id: row.article_id,
      quantite: row.quantite,
      prix_unitaire: Number(row.prix_unitaire),
      notes: row.notes,
      created_at: row.created_at,
      modele_nom: article?.snc_modeles?.nom ?? '—',
      variante: article?.variante ?? '',
      taille: article?.taille ?? '',
    }
  })
}

export async function getMouvements(limit = 100): Promise<Mouvement[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('snc_mouvements')
    .select(`
      id, date, article_id, quantite, sens, motif, created_at,
      snc_articles ( variante, taille, snc_modeles ( nom ) )
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((row) => {
    const article = row.snc_articles as unknown as ArticleJoin | null
    return {
      id: row.id,
      date: row.date,
      article_id: row.article_id,
      quantite: row.quantite,
      sens: row.sens,
      motif: row.motif,
      created_at: row.created_at,
      modele_nom: article?.snc_modeles?.nom ?? '—',
      variante: article?.variante ?? '',
      taille: article?.taille ?? '',
    }
  })
}
