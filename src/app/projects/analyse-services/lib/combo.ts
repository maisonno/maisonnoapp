// Client ComboHR Partner API — strictement côté serveur.
// La clé (COMBO_API_KEY) donne accès à tout le compte (salaires, n° de sécu) :
// elle ne doit jamais être exposée au navigateur ni renvoyée dans une réponse.
//
// Spec : ComboHR Partner API v1 — auth `doorkeeper` (http bearer),
// serveur `https://partner.combohr.com`, préfixe `/api/v1`.

export const COMBO_BASE = process.env.COMBO_API_BASE_URL ?? 'https://partner.combohr.com'

export const comboKey = () => process.env.COMBO_API_KEY ?? ''
const clientId = () => process.env.COMBO_CLIENT_ID ?? ''
const clientSecret = () => process.env.COMBO_CLIENT_SECRET ?? ''

export const comboConfigured = () =>
  comboKey().length > 0 || (clientId().length > 0 && clientSecret().length > 0)

// ─── Jeton d'accès ───
// La sécurité déclarée par la spec est `doorkeeper` (serveur OAuth2 de Rails).
// Deux cas de figure :
//  · COMBO_API_KEY = jeton d'accès déjà émis → utilisé tel quel ;
//  · COMBO_CLIENT_ID + COMBO_CLIENT_SECRET → échangés contre un jeton via
//    /oauth/token (grant client_credentials), puis mis en cache.

let cachedToken: { value: string; expiresAt: number } | null = null

export async function accessToken(): Promise<string> {
  const id = clientId()
  const secret = clientSecret()

  if (id && secret) {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value
    const url = `${COMBO_BASE.replace(/\/+$/, '')}/oauth/token`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    })
    const text = await res.text()
    if (!res.ok) {
      throw new ComboError(
        `Échange OAuth (/oauth/token) → HTTP ${res.status}. ${text.slice(0, 200)}`,
        res.status,
      )
    }
    let parsed: { access_token?: string; expires_in?: number }
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new ComboError('Réponse /oauth/token non-JSON.')
    }
    if (!parsed.access_token) throw new ComboError('Réponse /oauth/token sans access_token.')
    cachedToken = {
      value: parsed.access_token,
      expiresAt: Date.now() + (parsed.expires_in ?? 3600) * 1000,
    }
    return cachedToken.value
  }

  const direct = comboKey()
  if (!direct) throw new ComboError('Aucune information d’authentification ComboHR côté serveur.')
  return direct
}

// Diagnostic : ne révèle jamais les valeurs, seulement leur présence.
export type ComboAuthDiag = {
  hasApiKey: boolean
  apiKeyLength: number
  hasClientId: boolean
  hasClientSecret: boolean
  base: string
  tokenOk?: boolean
  tokenError?: string
}

export async function diagnoseAuth(): Promise<ComboAuthDiag> {
  const diag: ComboAuthDiag = {
    hasApiKey: comboKey().length > 0,
    apiKeyLength: comboKey().length,
    hasClientId: clientId().length > 0,
    hasClientSecret: clientSecret().length > 0,
    base: COMBO_BASE,
  }
  try {
    await accessToken()
    diag.tokenOk = true
  } catch (e) {
    diag.tokenOk = false
    diag.tokenError = (e as Error).message
  }
  return diag
}

// ─── Types (sous-ensemble utile de la spec) ───

export type ComboTeam = { id: string; name: string }
export type ComboLocation = {
  id: string
  name: string
  account_id?: string
  teams?: ComboTeam[]
}

export type ComboContract = {
  id: string
  original_contract_id?: string | null
  firstname?: string | null
  lastname?: string | null
  contract_type?: string | null
  contract_time?: number | null // heures hebdo contractuelles
  working_days_in_week?: number | null
  function?: string | null // intitulé de poste
  location_id?: string | null
  start_date?: string | null
  end_date?: string | null
  hourly_gross_rate?: number | null // coût horaire chargé (calculé par Combo)
  monthly_gross_salary?: number | null
  hourly_gross_salary?: number | null
  daily_worker?: boolean
  employee_number?: string | null
}

export type ComboPlanning = {
  id: string
  contract_id?: string | null
  date: string
  starts_at: string
  ends_at: string
  break_duration?: number | null // minutes
  real_starts_at?: string | null
  real_ends_at?: string | null
  real_break_duration?: number | null
  firstname?: string | null
  lastname?: string | null
  location_id?: string
  team_id?: string | null
}

// ─── Appels ───

export class ComboError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
  }
}

function scrub(text: string, key: string) {
  return key ? text.split(key).join('«CLÉ MASQUÉE»') : text
}

async function comboGet<T>(path: string, params: Record<string, string | undefined> = {}): Promise<T> {
  const token = await accessToken()

  const url = new URL(`${COMBO_BASE.replace(/\/+$/, '')}/api/v1/${path.replace(/^\/+/, '')}`)
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v)

  let res: Response
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20000),
      cache: 'no-store',
    })
  } catch (e) {
    throw new ComboError(`Appel ${path} : ${scrub((e as Error).message, token)}`)
  }

  const text = await res.text()
  if (!res.ok) {
    if (res.status === 401) cachedToken = null // force un nouvel échange au prochain appel
    const hint =
      res.status === 401
        ? " — jeton refusé. Si Combo t'a fourni un client_id + client_secret (OAuth doorkeeper), renseigne COMBO_CLIENT_ID et COMBO_CLIENT_SECRET plutôt que COMBO_API_KEY."
        : res.status === 403
          ? ' — accès refusé : le compte partenaire n’a pas les droits sur cette ressource.'
          : ''
    throw new ComboError(
      `${path} → HTTP ${res.status}${hint} ${scrub(text.slice(0, 200), token)}`,
      res.status,
    )
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new ComboError(`${path} : réponse non-JSON.`)
  }
}

export const getLocations = () => comboGet<ComboLocation[]>('locations')

// Contrats actifs à une date donnée sur un établissement
export const getContracts = (locationId: string, day?: string) =>
  comboGet<ComboContract[]>('contracts', { location_id: locationId, day })

// Contrats terminés sur une plage (paginé, 50/page)
export async function getPastContracts(
  locationId: string,
  startDate: string,
  endDate: string,
): Promise<ComboContract[]> {
  const out: ComboContract[] = []
  for (let page = 1; page <= 40; page++) {
    const res = await comboGet<{
      contracts?: ComboContract[]
      meta?: { has_next_page?: boolean }
    } | null>('past_contracts', {
      location_id: locationId,
      start_date: startDate,
      end_date: endDate,
      page: String(page),
    })
    const batch = res?.contracts ?? []
    out.push(...batch)
    if (!res?.meta?.has_next_page || batch.length === 0) break
  }
  return out
}

// Shifts sur une plage. L'API accepte de larges plages ; on découpe par mois
// pour rester dans des réponses raisonnables.
export const getPlannings = (startDate: string, endDate: string, locationId?: string) =>
  comboGet<ComboPlanning[]>('plannings', {
    start_date: startDate,
    end_date: endDate,
    location_id: locationId,
  })

// ─── Helpers de calcul ───

// Durée d'un shift en heures, pauses déduites. `real` = pointages réels.
export function shiftHours(p: ComboPlanning, real: boolean): number {
  const s = real ? p.real_starts_at : p.starts_at
  const e = real ? p.real_ends_at : p.ends_at
  const brk = (real ? p.real_break_duration : p.break_duration) ?? 0
  if (!s || !e) return 0
  const ms = new Date(e).getTime() - new Date(s).getTime()
  if (!isFinite(ms) || ms <= 0) return 0
  return Math.max(0, ms / 3600000 - brk / 60)
}

// Clé de semaine ISO (lundi) d'une date 'YYYY-MM-DD'
export function isoWeekKey(day: string): string {
  const d = new Date(`${day}T00:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7 // 0 = lundi
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}
