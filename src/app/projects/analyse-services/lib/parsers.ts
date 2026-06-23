// Parsing des fichiers d'import (côté client, SheetJS / CSV)
// Réplique des fonctions num() / rate() / isoDate() / parseVentes() / parsePoireRows()
// du HTML de référence, mais produit des lignes prêtes à upsert en base.

import * as XLSX from 'xlsx'
import type { LineUpsertRow, PoireUpsertRow, TicketUpsertRow } from './types'

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

export type FileKind = 'ventes' | 'poire' | 'unknown'

export function detectWorkbookKind(wb: XLSX.WorkBook): FileKind {
  if (wb.Sheets['SalesDocumentLines'] && wb.Sheets['SalesDocument']) return 'ventes'
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
