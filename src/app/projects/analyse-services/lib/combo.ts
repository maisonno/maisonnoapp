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
  'https://api.combohr.com',
  'https://api.snapshift.co',
  'https://app.combohr.com/api',
  'https://app.snapshift.co/api',
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

// Appel direct une fois la base et le schéma connus (via variables d'env).
export async function comboGet(path: string): Promise<ProbeResult> {
  const key = comboKey()
  const base = process.env.COMBO_API_BASE_URL ?? BASE_CANDIDATES[0]
  const scheme = (process.env.COMBO_AUTH_SCHEME as AuthScheme) ?? 'bearer'
  return callOnce(base, scheme, path, key)
}
