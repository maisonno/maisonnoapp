import * as XLSX from 'xlsx'
import type { DishCategory } from './types'
import { CATEGORY_ORDER } from './types'

export type DishImportRow = {
  name: string
  description: string | null
  price: number | null
  category: DishCategory
  is_active: boolean
}

const CATEGORY_ALIASES: Record<string, DishCategory> = {
  entree: 'entree',
  entrée: 'entree',
  'a partager': 'a_partager',
  'à partager': 'a_partager',
  a_partager: 'a_partager',
  partager: 'a_partager',
  plat: 'plat',
  pizza: 'pizza',
  salade: 'salade',
  salades: 'salade',
  dessert: 'dessert',
  desserts: 'dessert',
  glace: 'glace',
  glaces: 'glace',
}

function parseCategory(raw: string): DishCategory {
  const normalized = raw.toLowerCase().trim()
  return CATEGORY_ALIASES[normalized] ?? 'plat'
}

function parsePrice(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'))
  return isNaN(n) ? null : n
}

export function parseDishesFromBuffer(buffer: ArrayBuffer): {
  rows: DishImportRow[]
  errors: string[]
} {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  const rows: DishImportRow[] = []
  const errors: string[] = []

  rawRows.forEach((raw, i) => {
    const rowNum = i + 2 // 1-indexed + header row

    // Accept flexible column names (case-insensitive)
    const keys = Object.keys(raw).reduce<Record<string, unknown>>((acc, k) => {
      acc[k.toLowerCase().trim()] = raw[k]
      return acc
    }, {})

    const name = String(keys['nom'] ?? keys['name'] ?? '').trim()
    if (!name) {
      errors.push(`Ligne ${rowNum} : colonne "nom" manquante ou vide`)
      return
    }

    const categoryRaw = String(keys['catégorie'] ?? keys['categorie'] ?? keys['category'] ?? 'plat')
    const category = parseCategory(categoryRaw)

    if (!CATEGORY_ORDER.includes(category)) {
      errors.push(`Ligne ${rowNum} : catégorie inconnue "${categoryRaw}"`)
    }

    const priceRaw = keys['prix'] ?? keys['price'] ?? null
    const price = parsePrice(priceRaw as string | number | null)

    const description = String(keys['description'] ?? '').trim() || null

    const activeRaw = String(keys['actif'] ?? keys['active'] ?? 'oui').toLowerCase().trim()
    const is_active = !['non', 'no', 'false', '0'].includes(activeRaw)

    rows.push({ name, description, price, category, is_active })
  })

  return { rows, errors }
}
