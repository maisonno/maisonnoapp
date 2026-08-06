// Client HTTP ComboHR — strictement côté serveur (importé uniquement depuis
// actions.ts, marqué 'use server').
// La clé (COMBO_API_KEY) donne accès à TOUT le compte (salaires, n° de sécu) :
// elle ne doit jamais être exposée au navigateur ni renvoyée dans une réponse.
//
// La documentation de la « Partner API » n'étant pas publique, la base d'URL et
// le schéma d'authentification sont découverts par sondage (voir probeCombo)
// puis figés via les variables d'environnement COMBO_API_BASE_URL et
// COMBO_AUTH_SCHEME.

export const comboKey = () => process.env.COMBO_API_KEY ?? ''
export const comboConfigured = () => comboKey().length > 0

export const BASE_CANDIDATES = [
  'https://partner.combohr.com',
  'https://api.combohr.com',
  'https://api.snapshift.co',
  'https://app.combohr.com/api',
]

// Emplacements habituels de la spec OpenAPI derrière une UI Swagger
export const SPEC_CANDIDATES = [
  'https://partner.combohr.com/swagger.json',
  'https://partner.combohr.com/swagger/v1/swagger.json',
  'https://partner.combohr.com/openapi.json',
  'https://partner.combohr.com/v3/api-docs',
  'https://partner.combohr.com/swagger/doc.json',
  'https://partner.combohr.com/api-docs',
]

export const AUTH_SCHEMES = ['bearer', 'x-api-key', 'api-key', 'authorization-raw'] as const
export type AuthScheme = (typeof AUTH_SCHEMES)[number]

export function authHeaders(scheme: AuthScheme, key: string): Record<string, string> {
  switch (scheme) {
    case 'bearer':
      return { Authorization: `Bearer ${key}` }
    case 'x-api-key':
      return { 'X-Api-Key': key }
    case 'api-key':
      return { 'Api-Key': key }
    case 'authorization-raw':
      return { Authorization: key }
  }
}

export type ProbeResult = {
  base: string
  scheme: AuthScheme
  path: string
  status: number | null
  ok: boolean
  contentType: string | null
  excerpt: string
  error?: string
}

// Retire toute occurrence de la clé d'un texte, par précaution.
function scrub(text: string, key: string): string {
  if (!key) return text
  return text.split(key).join('«CLÉ MASQUÉE»')
}

async function callOnce(
  base: string,
  scheme: AuthScheme,
  path: string,
  key: string,
  timeoutMs = 8000,
): Promise<ProbeResult> {
  const url = `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', ...authHeaders(scheme, key) },
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    })
    const raw = await res.text()
    return {
      base,
      scheme,
      path,
      status: res.status,
      ok: res.ok,
      contentType: res.headers.get('content-type'),
      excerpt: scrub(raw.slice(0, 1200), key),
    }
  } catch (e) {
    return {
      base,
      scheme,
      path,
      status: null,
      ok: false,
      contentType: null,
      excerpt: '',
      error: scrub((e as Error).message, key),
    }
  }
}

// Sonde les combinaisons base × schéma d'auth sur un chemin donné.
// S'arrête dès qu'une combinaison répond 2xx.
export async function probeCombo(path: string): Promise<ProbeResult[]> {
  const key = comboKey()
  if (!key) return []
  const results: ProbeResult[] = []
  for (const base of BASE_CANDIDATES) {
    for (const scheme of AUTH_SCHEMES) {
      const r = await callOnce(base, scheme, path, key)
      results.push(r)
      if (r.ok) return results // combinaison trouvée
      // Inutile de tester les autres schémas si l'hôte est injoignable
      if (r.error && /ENOTFOUND|EAI_AGAIN|ECONNREFUSED/.test(r.error)) break
    }
  }
  return results
}

// ─── Récupération de la spec OpenAPI ───
// Le sandbox de développement ne peut pas joindre Combo : c'est le serveur de
// production qui va chercher la spec, la parse et n'en renvoie qu'un résumé.

export type SpecSummary = {
  url: string
  title?: string
  version?: string
  servers: string[]
  security: { name: string; type: string; in?: string; scheme?: string }[]
  endpoints: { method: string; path: string; summary?: string }[]
  schemas: string[]
}

type OpenApiDoc = {
  info?: { title?: string; version?: string }
  servers?: { url?: string }[]
  host?: string
  basePath?: string
  schemes?: string[]
  paths?: Record<string, Record<string, { summary?: string; description?: string }>>
  components?: {
    securitySchemes?: Record<string, { type?: string; in?: string; name?: string; scheme?: string }>
    schemas?: Record<string, unknown>
  }
  securityDefinitions?: Record<string, { type?: string; in?: string; name?: string }>
  definitions?: Record<string, unknown>
}

function summarizeSpec(url: string, doc: OpenApiDoc): SpecSummary {
  const servers = (doc.servers ?? []).map((s) => s.url ?? '').filter(Boolean)
  if (servers.length === 0 && doc.host) {
    const scheme = doc.schemes?.[0] ?? 'https'
    servers.push(`${scheme}://${doc.host}${doc.basePath ?? ''}`)
  }

  const secSrc = doc.components?.securitySchemes ?? doc.securityDefinitions ?? {}
  const security = Object.entries(secSrc).map(([k, v]) => ({
    name: v?.name ?? k,
    type: v?.type ?? '?',
    in: v?.in,
    scheme: (v as { scheme?: string })?.scheme,
  }))

  const endpoints: SpecSummary['endpoints'] = []
  for (const [p, ops] of Object.entries(doc.paths ?? {})) {
    for (const [method, op] of Object.entries(ops ?? {})) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) continue
      endpoints.push({
        method: method.toUpperCase(),
        path: p,
        summary: op?.summary ?? op?.description?.slice(0, 120),
      })
    }
  }
  endpoints.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))

  const schemas = Object.keys(doc.components?.schemas ?? doc.definitions ?? {})

  return {
    url,
    title: doc.info?.title,
    version: doc.info?.version,
    servers,
    security,
    endpoints,
    schemas,
  }
}

export async function fetchComboSpec(
  explicitUrl?: string,
): Promise<{ spec?: SpecSummary; tried: { url: string; status: number | null; note: string }[] }> {
  const key = comboKey()
  const urls = explicitUrl ? [explicitUrl] : SPEC_CANDIDATES
  const tried: { url: string; status: number | null; note: string }[] = []

  for (const url of urls) {
    // Avec puis sans authentification (certaines specs sont publiques)
    for (const headers of [
      { Accept: 'application/json', ...(key ? authHeaders('bearer', key) : {}) },
      { Accept: 'application/json' },
    ]) {
      try {
        const res = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(12000),
          cache: 'no-store',
        })
        const text = await res.text()
        if (!res.ok) {
          tried.push({ url, status: res.status, note: scrub(text.slice(0, 120), key) })
          continue
        }
        try {
          const doc = JSON.parse(text) as OpenApiDoc
          if (doc.paths) return { spec: summarizeSpec(url, doc), tried }
          tried.push({ url, status: res.status, note: 'JSON sans champ "paths"' })
        } catch {
          tried.push({ url, status: res.status, note: 'réponse non-JSON (page HTML ?)' })
        }
      } catch (e) {
        tried.push({ url, status: null, note: scrub((e as Error).message, key) })
      }
    }
  }
  return { tried }
}

// Appel direct une fois la base et le schéma connus (via variables d'env).
export async function comboGet(path: string): Promise<ProbeResult> {
  const key = comboKey()
  const base = process.env.COMBO_API_BASE_URL ?? BASE_CANDIDATES[0]
  const scheme = (process.env.COMBO_AUTH_SCHEME as AuthScheme) ?? 'bearer'
  return callOnce(base, scheme, path, key)
}
