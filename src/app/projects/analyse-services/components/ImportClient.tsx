'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { EUR } from '../lib/format'
import {
  csvToRows,
  detectWorkbookKind,
  parsePoireRows,
  parsePoireWorkbook,
  parseVentes,
} from '../lib/parsers'

const BATCH = 500

type FileResult = {
  name: string
  kind: 'ventes' | 'poire' | 'error'
  info: string
}

export default function ImportClient() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<FileResult[]>([])
  const [progress, setProgress] = useState<{ label: string; pct: number } | null>(null)
  const [error, setError] = useState('')

  async function upsertBatched<T>(
    table: string,
    rows: T[],
    onConflict: string,
    onTick: (processed: number) => void,
  ) {
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH)
      const { error: e } = await supabase.from(table).upsert(chunk, { onConflict })
      if (e) throw new Error(e.message)
      onTick(Math.min(i + BATCH, rows.length))
    }
  }

  async function processFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setError('')
    setBusy(true)
    const files = [...fileList]
    const acc: FileResult[] = [...results]
    let touched = false

    for (const f of files) {
      try {
        if (f.name.toLowerCase().endsWith('.csv')) {
          const text = await f.text()
          const { poire, rowsIn } = parsePoireRows(csvToRows(text), f.name)
          await importPoire(poire, f.name, rowsIn)
          acc.push({ name: f.name, kind: 'poire', info: poireInfo(poire) })
          touched = true
        } else {
          const buf = await f.arrayBuffer()
          const wb = XLSX.read(buf, { type: 'array', cellDates: true })
          const kind = detectWorkbookKind(wb)
          if (kind === 'ventes') {
            const { tickets, lines, rowsIn } = parseVentes(wb, f.name)
            await importVentes(tickets, lines, f.name, rowsIn)
            acc.push({
              name: f.name,
              kind: 'ventes',
              info: `${tickets.length.toLocaleString('fr-FR')} tickets · ${lines.length.toLocaleString('fr-FR')} lignes`,
            })
            touched = true
          } else if (kind === 'poire') {
            const { poire, rowsIn } = parsePoireWorkbook(wb, f.name)
            await importPoire(poire, f.name, rowsIn)
            acc.push({ name: f.name, kind: 'poire', info: poireInfo(poire) })
            touched = true
          } else {
            throw new Error(
              'ni un export L’Addition (feuilles SalesDocumentLines + SalesDocument), ni un fichier Poire (colonne « Poire » + une date).',
            )
          }
        }
      } catch (err) {
        acc.push({ name: f.name, kind: 'error', info: (err as Error).message })
      }
      setResults([...acc])
    }

    // Recalcule la vue matérialisée des métriques (sinon les nouvelles
    // données n'apparaissent pas au tableau de bord).
    if (touched) {
      setProgress({ label: 'Mise à jour des statistiques…', pct: 100 })
      const { error: e } = await supabase.rpc('ana_refresh_metrics')
      if (e) setError(`Import écrit, mais le recalcul des statistiques a échoué : ${e.message}`)
    }

    setProgress(null)
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
    router.refresh()
  }

  async function importVentes(
    tickets: Awaited<ReturnType<typeof parseVentes>>['tickets'],
    lines: Awaited<ReturnType<typeof parseVentes>>['lines'],
    fname: string,
    rowsIn: number,
  ) {
    const total = tickets.length + lines.length || 1
    let done = 0
    const tick = (extra: number) => {
      done = extra
      setProgress({ label: `${fname} — écriture en base…`, pct: Math.round((100 * done) / total) })
    }
    // Tickets AVANT les lignes (contrainte FK)
    await upsertBatched('ana_tickets', tickets, 'ticket_id', (p) => tick(p))
    const base = tickets.length
    await upsertBatched('ana_lines', lines, 'line_id', (p) => tick(base + p))
    await supabase.from('ana_import_log').insert({
      kind: 'ventes',
      file_name: fname,
      rows_in: rowsIn,
      tickets_upserted: tickets.length,
      lines_upserted: lines.length,
    })
  }

  async function importPoire(
    poire: Awaited<ReturnType<typeof parsePoireRows>>['poire'],
    fname: string,
    rowsIn: number,
  ) {
    const total = poire.length || 1
    await upsertBatched('ana_poire_daily', poire, 'jour', (p) =>
      setProgress({ label: `${fname} — écriture de la Poire…`, pct: Math.round((100 * p) / total) }),
    )
    await supabase.from('ana_import_log').insert({
      kind: 'poire',
      file_name: fname,
      rows_in: rowsIn,
      poire_upserted: poire.length,
    })
  }

  const loaded = results.filter((r) => r.kind !== 'error').length

  return (
    <>
      <label
        className={`drop${over ? ' over' : ''}${loaded ? ' loaded' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setOver(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          if (!busy) processFiles(e.dataTransfer.files)
        }}
      >
        <div className="ic">{loaded ? '🍎' : '📄'}</div>
        <div className="txt">
          <b>{busy ? 'Import en cours…' : loaded ? `${loaded} fichier${loaded > 1 ? 's' : ''} importé${loaded > 1 ? 's' : ''}` : 'Dépose tes fichiers ici'}</b>
          <small>
            exports L’Addition (.xlsx) + Poire (.csv Scoubidoo ou .xlsx) — clique pour choisir. Ré-importer un
            export déjà chargé ne crée aucun doublon.
          </small>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          multiple
          disabled={busy}
          onChange={(e) => processFiles(e.target.files)}
        />
      </label>

      {progress && (
        <>
          <div className="progress">
            <i style={{ width: `${progress.pct}%` }} />
          </div>
          <div className="progress-label">
            {progress.label} {progress.pct} %
          </div>
        </>
      )}

      {results.length > 0 && (
        <div className="filelist">
          {results.map((r, i) => (
            <span className="chip" key={i}>
              <span className={`b ${r.kind}`}>
                {r.kind === 'ventes' ? 'Ventes' : r.kind === 'poire' ? 'Poire' : 'Erreur'}
              </span>
              {r.name} <small>· {r.info}</small>
            </span>
          ))}
        </div>
      )}

      {error && <div className="err">{error}</div>}

      {loaded > 0 && !busy && (
        <div className="ok">
          Import terminé. <Link href="/projects/analyse-services">Voir le tableau de bord →</Link>
        </div>
      )}
    </>
  )
}

function poireInfo(poire: { montant_ttc: number }[]): string {
  const sum = poire.reduce((s, p) => s + p.montant_ttc, 0)
  return `${poire.length} jour${poire.length > 1 ? 's' : ''} · ${EUR(sum)}`
}
