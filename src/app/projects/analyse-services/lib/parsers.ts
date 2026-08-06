// Parsing des fichiers d'import (côté client, SheetJS / CSV)
// Réplique des fonctions num() / rate() / isoDate() / parseVentes() / parsePoireRows()
// du HTML de référence, mais produit des lignes prêtes à upsert en base.

import * as XLSX from 'xlsx'
import type { LaborUpsertRow, LineUpsertRow, PoireUpsertRow, TicketUpsertRow } from './types'

// ─── Coercition robuste ───

export function num(v: unknown): number {
  if (v == null) return 0
  const x = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'))
  return isFinite(x) ? x : 0
}

// Normalisation du taux de TVA → décimal : "10%"→0.10, 10→0.10, 0.1→0.10, null→0
export function rate(t: unknown): number {
  if (t == null) return 0
  if (typeof t === 'number') return t > 1 ? t / 100 : t
  const s = String(t).trim()
  if (s.endsWith('%')) return num(s.slice(0, -1)) / 100
  const x = num(s)
  return x > 1 ? x / 100 : x
}

// Dates : Date, série Excel, 'YYYY-MM-DD', 'DD/MM/YYYY' → 'YYYY-MM-DD' (ou '')
export function isoDate(v: unknown): string {
  if (v instanceof Date) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof v === 'number') {
    const d = new Date(Date.UTC(1899, 11, 30 + Math.floor(v)))
    return d.toISOString().slice(0, 10)
  }
  const s = String(v ?? '').trim()
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  const d = new Date(s)
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function toInt(v: unknown): number {
  return Math.trunc(num(v))
}

type Row = Record<string, unknown>

// Repère une colonne dont l'entête contient l'un des mots-clés (insensible à la casse)
export function findCol(row: Row, keys: string[]): string | null {
  for (const k of Object.keys(row)) {
    const lk = k.toLowerCase().trim()
    if (keys.some((x) => lk === x || lk.includes(x))) return k
  }
  return null
}

// ─── Détection du type de fichier ───

export type FileKind = 'ventes' | 'poire' | 'combo' | 'unknown'

// Repère l'onglet « Synthèse » de l'export comptable Combo (entête « Salaire de base »)
function comboSyntheseName(wb: XLSX.WorkBook): string | null {
  for (const sn of wb.SheetNames) {
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, defval: null, raw: true })
    for (const row of aoa.slice(0, 3)) {
      if (Array.isArray(row) && row.some((c) => String(c ?? '').toLowerCase().includes('salaire de base'))) {
        return sn
      }
    }
  }
  return null
}

export function detectWorkbookKind(wb: XLSX.WorkBook): FileKind {
  if (wb.Sheets['SalesDocumentLines'] && wb.Sheets['SalesDocument']) return 'ventes'
  if (comboSyntheseName(wb)) return 'combo'
  for (const sn of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets[sn], { defval: null, raw: true })
    if (rows.length && findCol(rows[0], ['poire'])) return 'poire'
  }
  return 'unknown'
}

// ─── Import L'Addition (.xlsx) ───

export type VentesParse = {
  tickets: TicketUpsertRow[]
  lines: LineUpsertRow[]
  rowsIn: number
}

export function parseVentes(wb: XLSX.WorkBook, fname: string): VentesParse {
  const lineRows = XLSX.utils.sheet_to_json<Row>(wb.Sheets['SalesDocumentLines'], {
    defval: null,
    raw: true,
  })
  const docRows = XLSX.utils.sheet_to_json<Row>(wb.Sheets['SalesDocument'], {
    defval: null,
    raw: true,
  })

  // Métadonnées tickets depuis SalesDocument
  type DocMeta = {
    jour: string
    heure: number
    couverts: number
    total_ttc: number | null
    total_ht: number | null
    tag_split: string | null
    etablissement: string | null
  }
  const docMeta: Record<string, DocMeta> = {}
  for (const r of docRows) {
    const id = r['ID Ticket']
    if (id == null || id === '') continue
    const key = String(id)
    const totalTtcCol = findCol(r, ['total ttc', 'total_ttc', 'montant ttc'])
    const totalHtCol = findCol(r, ['total ht', 'total_ht', 'montant ht'])
    const etabCol = findCol(r, ['etablissement', 'établissement', 'etablissment'])
    docMeta[key] = {
      jour: isoDate(r['Jour']),
      heure: toInt(num(r['Heure'])),
      couverts: num(r['Couverts']),
      total_ttc: totalTtcCol ? num(r[totalTtcCol]) : null,
      total_ht: totalHtCol ? num(r[totalHtCol]) : null,
      tag_split: r['TAG_Split'] != null ? String(r['TAG_Split']) : null,
      etablissement: etabCol && r[etabCol] != null ? String(r[etabCol]) : null,
    }
  }

  // Lignes + collecte des jours par ticket (fallback si absent de SalesDocument)
  const lines: LineUpsertRow[] = []
  const lineJour: Record<string, string> = {}
  const lineTicketIds = new Set<string>()

  for (const r of lineRows) {
    const tid = r['ID Ticket']
    const lid = r['ID']
    if (tid == null || tid === '' || lid == null || lid === '') continue
    const ticketId = String(tid)
    const lineId = String(lid)
    const jourLine = isoDate(r['Jour'])
    if (jourLine && !lineJour[ticketId]) lineJour[ticketId] = jourLine
    lineTicketIds.add(ticketId)

    lines.push({
      line_id: lineId,
      ticket_id: ticketId,
      jour: jourLine, // corrigé plus bas si vide
      nom: r['Nom'] != null ? String(r['Nom']) : null,
      qte: num(r['Qte']),
      prix_ht: num(r['Prix HT']),
      taux: rate(r['Taux']),
      categorie: r['TAG_Catégorie'] != null ? String(r['TAG_Catégorie']) : null,
      type_produit: r['TAG_TypeProduit'] != null ? String(r['TAG_TypeProduit']) : null,
      offert: r['TAG_Offered'] === 'OUI',
      offerts_ht: num(r['Offerts HT']),
      source_file: fname,
    })
  }

  // Ensemble des tickets = union(SalesDocument, tickets référencés par les lignes)
  const allTicketIds = new Set<string>([...Object.keys(docMeta), ...lineTicketIds])
  const tickets: TicketUpsertRow[] = []
  const ticketJour: Record<string, string> = {}

  for (const id of allTicketIds) {
    const meta = docMeta[id]
    const jour = (meta?.jour && meta.jour) || lineJour[id] || ''
    if (!jour) continue // pas de date exploitable : on ignore le ticket (et ses lignes)
    ticketJour[id] = jour
    tickets.push({
      ticket_id: id,
      jour,
      heure: meta ? meta.heure : 0,
      couverts: meta?.couverts ?? 0,
      total_ttc: meta?.total_ttc ?? null,
      total_ht: meta?.total_ht ?? null,
      tag_split: meta?.tag_split ?? null,
      etablissement: meta?.etablissement ?? null,
      source_file: fname,
    })
  }

  // Ne conserver que les lignes rattachées à un ticket valide ; corriger le jour vide
  const validLines = lines.filter((l) => ticketJour[l.ticket_id])
  for (const l of validLines) if (!l.jour) l.jour = ticketJour[l.ticket_id]

  return { tickets, lines: validLines, rowsIn: lineRows.length }
}

// ─── Import Poire (.csv Scoubidoo ou .xlsx) ───

export function csvToRows(text: string): Row[] {
  text = text.replace(/^﻿/, '').trim()
  const linesArr = text.split(/\r?\n/)
  if (!linesArr.length) return []
  const first = linesArr[0]
  const delim = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ','
  const head = first.split(delim).map((s) => s.trim())
  return linesArr
    .slice(1)
    .filter((l) => l.trim())
    .map((l) => {
      const c = l.split(delim)
      const o: Row = {}
      head.forEach((h, i) => (o[h] = (c[i] ?? '').trim()))
      return o
    })
}

export type PoireParse = { poire: PoireUpsertRow[]; rowsIn: number }

// Agrège la Poire au jour (somme si plusieurs lignes le même jour)
export function parsePoireRows(rows: Row[], fname: string): PoireParse {
  if (!rows.length) return { poire: [], rowsIn: 0 }
  const dateCol = findCol(rows[0], ['date', 'jour'])
  const poireCol = findCol(rows[0], ['poire'])
  if (!dateCol || !poireCol) throw new Error('colonne « date » ou « Poire » introuvable')
  const tagCol = findCol(rows[0], ['tag'])

  const byDay: Record<string, { montant: number; tag: string | null }> = {}
  for (const r of rows) {
    const d = isoDate(r[dateCol])
    if (!d) continue
    const v = num(r[poireCol])
    const tag = tagCol && r[tagCol] != null && String(r[tagCol]).trim() ? String(r[tagCol]).trim() : null
    const cur = byDay[d] || (byDay[d] = { montant: 0, tag: null })
    cur.montant += v
    if (tag && !cur.tag) cur.tag = tag
  }

  const poire: PoireUpsertRow[] = Object.entries(byDay).map(([jour, { montant, tag }]) => ({
    jour,
    montant_ttc: montant,
    tag,
    source_file: fname,
  }))
  return { poire, rowsIn: rows.length }
}

// Lit un fichier Poire .xlsx (première feuille contenant une colonne « Poire »)
export function parsePoireWorkbook(wb: XLSX.WorkBook, fname: string): PoireParse {
  for (const sn of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets[sn], { defval: null, raw: true })
    if (rows.length && findCol(rows[0], ['poire'])) return parsePoireRows(rows, fname)
  }
  throw new Error('aucune feuille avec une colonne « Poire »')
}

// ─── Import Combo (export comptable, onglet « Synthèse ») ───

export type ComboParse = { labor: LaborUpsertRow[]; periode: string; rowsIn: number }

// Hash anonyme stable (FNV-1a 32 bits, hex) — le nom ne quitte jamais le navigateur.
function anonHash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

// Indice de la 1re colonne dont l'entête contient l'un des mots-clés
function findIdx(headers: unknown[], keys: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] ?? '').toLowerCase().trim()
    if (h && keys.some((k) => h === k || h.includes(k))) return i
  }
  return -1
}

// Mois de paie (YYYY-MM) le plus fréquent parmi les dates début/fin des onglets EVP/Absences
function periodFromDates(wb: XLSX.WorkBook): string | null {
  const tally: Record<string, number> = {}
  for (const sn of ['Éléments Variables de Paie', 'Absences']) {
    const ws = wb.Sheets[sn]
    if (!ws) continue
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: false })
    if (!aoa.length) continue
    const hdr = aoa[0] as unknown[]
    const di = findIdx(hdr, ['date début', 'date debut'])
    const fi = findIdx(hdr, ['date fin'])
    for (const row of aoa.slice(1)) {
      for (const idx of [di, fi]) {
        if (idx < 0) continue
        const iso = isoDate((row as unknown[])[idx])
        if (iso) tally[iso.slice(0, 7)] = (tally[iso.slice(0, 7)] || 0) + 1
      }
    }
  }
  const entries = Object.entries(tally)
  if (!entries.length) return null
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0]
}

// Repli : période depuis le nom de fichier Combo (« …2026__0105__3105… » → 2026-05)
function periodFromFilename(fname: string): string | null {
  const m = fname.match(/(\d{4})\D+(\d{2})(\d{2})\D+(\d{2})(\d{2})/)
  if (m) return `${m[1]}-${m[3]}` // m[3] = mois du 1er jour (DDMM)
  return null
}

export function parseComboSynthese(wb: XLSX.WorkBook, fname: string): ComboParse {
  const sn = comboSyntheseName(wb)
  if (!sn) throw new Error('onglet « Synthèse » (colonne « Salaire de base ») introuvable')
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, defval: null, raw: true })

  // La feuille a 2 lignes d'entête (groupes puis colonnes) : on prend celle qui contient « Salaire de base »
  let hIdx = aoa.findIndex(
    (r) => Array.isArray(r) && r.some((c) => String(c ?? '').toLowerCase().includes('salaire de base')),
  )
  if (hIdx < 0) hIdx = 1
  const hdr = aoa[hIdx] as unknown[]

  const iNom = findIdx(hdr, ['nom'])
  const iPrenom = findIdx(hdr, ['prénom', 'prenom'])
  const iPoste = findIdx(hdr, ['poste'])
  const iContrat = findIdx(hdr, ['contrat'])
  const iBase = findIdx(hdr, ['salaire de base'])
  const iHmois = findIdx(hdr, ['heures contrat mensuel'])
  const iHtrav = findIdx(hdr, ['heures travaillées', 'heures travaillees'])
  const iJours = findIdx(hdr, ['total jours travaillés', 'total jours travailles', 'jours travaillés'])
  const iS10 = findIdx(hdr, ['heures supp. 10.0% (hors contrat)'])
  const iS20 = findIdx(hdr, ['heures supp. 20.0% (hors contrat)'])
  const iS50 = findIdx(hdr, ['heures supp. 50.0% (hors contrat)'])
  const iNuit = findIdx(hdr, ['heures majorées de nuit', 'heures majorees de nuit'])
  const iFeries = findIdx(hdr, ['majorées (jours fériés)', 'majorees (jours feries)'])
  const i1Mai = findIdx(hdr, ['heures majorées 1er mai', 'heures majorees 1er mai'])
  const iCP = findIdx(hdr, ['congé payé', 'conge paye'])

  const orNull = (idx: number, row: unknown[]) => (idx >= 0 ? num(row[idx]) : null)

  const periode = periodFromDates(wb) || periodFromFilename(fname)
  if (!periode) throw new Error('impossible de déterminer le mois de paie (dates EVP et nom de fichier illisibles)')
  const periodeDate = `${periode}-01`

  const byHash: Record<string, LaborUpsertRow> = {}
  let rowsIn = 0
  for (const row of aoa.slice(hIdx + 1)) {
    if (!Array.isArray(row)) continue
    const nom = iNom >= 0 ? String(row[iNom] ?? '').trim() : ''
    const prenom = iPrenom >= 0 ? String(row[iPrenom] ?? '').trim() : ''
    // Ignore la ligne « TOTAL » et les lignes sans salaire de base
    if (!nom || prenom.toUpperCase() === 'TOTAL') continue
    const base = iBase >= 0 ? num(row[iBase]) : 0
    if (!base) continue
    rowsIn++
    const contrat = iContrat >= 0 && row[iContrat] != null ? String(row[iContrat]).trim() : null
    const employe_hash = anonHash(`${nom}|${prenom}|${contrat ?? ''}`)
    byHash[employe_hash] = {
      periode: periodeDate,
      employe_hash,
      nom,
      prenom,
      poste: iPoste >= 0 && row[iPoste] != null ? String(row[iPoste]).trim() : null,
      contrat,
      salaire_base: base,
      heures_contrat_mensuel: orNull(iHmois, row),
      heures_travaillees: orNull(iHtrav, row),
      jours_travailles: orNull(iJours, row),
      h_supp_10: orNull(iS10, row),
      h_supp_20: orNull(iS20, row),
      h_supp_50: orNull(iS50, row),
      h_nuit: orNull(iNuit, row),
      h_feries: orNull(iFeries, row),
      h_1er_mai: orNull(i1Mai, row),
      conges_payes_j: orNull(iCP, row),
      source_file: fname,
    }
  }
  return { labor: Object.values(byHash), periode: periodeDate, rowsIn }
}
