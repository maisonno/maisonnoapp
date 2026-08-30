// Météo quotidienne à l'Île du Levant — source Open-Meteo (CC BY 4.0, sans clé).
//
// Deux endpoints complémentaires :
//   · archive-api  (réanalyse ERA5) → historique fiable, mais ~5 jours de retard ;
//   · api/forecast (past_days)      → jours récents et prévisions à venir.
// On couvre donc l'historique par le premier et la fenêtre récente par le second.

export const LEVANT = { latitude: 43.0167, longitude: 6.4667, timezone: 'Europe/Paris' }

const DAILY_VARS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'wind_speed_10m_max',
].join(',')

export type MeteoJour = {
  jour: string
  weather_code: number | null
  t_max: number | null
  t_min: number | null
  precipitation: number | null
  vent_max: number | null
  source: string
}

// ─── Codes WMO → pictogramme ───
// https://open-meteo.com/en/docs — tableau « Weather variable documentation »
const WMO: Record<number, { icon: string; label: string }> = {
  0: { icon: '☀️', label: 'Ciel dégagé' },
  1: { icon: '🌤️', label: 'Plutôt dégagé' },
  2: { icon: '⛅', label: 'Partiellement nuageux' },
  3: { icon: '☁️', label: 'Couvert' },
  45: { icon: '🌫️', label: 'Brouillard' },
  48: { icon: '🌫️', label: 'Brouillard givrant' },
  51: { icon: '🌦️', label: 'Bruine faible' },
  53: { icon: '🌦️', label: 'Bruine' },
  55: { icon: '🌦️', label: 'Bruine forte' },
  56: { icon: '🌧️', label: 'Bruine verglaçante' },
  57: { icon: '🌧️', label: 'Bruine verglaçante forte' },
  61: { icon: '🌧️', label: 'Pluie faible' },
  63: { icon: '🌧️', label: 'Pluie' },
  65: { icon: '🌧️', label: 'Pluie forte' },
  66: { icon: '🌧️', label: 'Pluie verglaçante' },
  67: { icon: '🌧️', label: 'Pluie verglaçante forte' },
  71: { icon: '🌨️', label: 'Neige faible' },
  73: { icon: '🌨️', label: 'Neige' },
  75: { icon: '🌨️', label: 'Neige forte' },
  77: { icon: '🌨️', label: 'Grains de neige' },
  80: { icon: '🌦️', label: 'Averses faibles' },
  81: { icon: '🌦️', label: 'Averses' },
  82: { icon: '⛈️', label: 'Averses violentes' },
  85: { icon: '🌨️', label: 'Averses de neige' },
  86: { icon: '🌨️', label: 'Fortes averses de neige' },
  95: { icon: '⛈️', label: 'Orage' },
  96: { icon: '⛈️', label: 'Orage avec grêle' },
  99: { icon: '⛈️', label: 'Orage avec forte grêle' },
}

export const meteoIcon = (code: number | null | undefined) =>
  code == null ? '' : (WMO[code]?.icon ?? '·')

export const meteoLabel = (code: number | null | undefined) =>
  code == null ? 'Météo inconnue' : (WMO[code]?.label ?? `Code WMO ${code}`)

// Infobulle : « Couvert · 24 → 18 °C · 3 mm · vent 35 km/h »
export function meteoTooltip(m: {
  weather_code: number | null
  t_max: number | null
  t_min: number | null
  precipitation: number | null
  vent_max: number | null
}): string {
  const bits = [meteoLabel(m.weather_code)]
  if (m.t_max != null) {
    bits.push(m.t_min != null ? `${Math.round(m.t_max)} / ${Math.round(m.t_min)} °C` : `${Math.round(m.t_max)} °C`)
  }
  if (m.precipitation != null && m.precipitation > 0) bits.push(`${m.precipitation} mm`)
  if (m.vent_max != null) bits.push(`vent ${Math.round(m.vent_max)} km/h`)
  return bits.join(' · ')
}

// ─── Récupération ───

type OpenMeteoDaily = {
  daily?: {
    time?: string[]
    weather_code?: (number | null)[]
    temperature_2m_max?: (number | null)[]
    temperature_2m_min?: (number | null)[]
    precipitation_sum?: (number | null)[]
    wind_speed_10m_max?: (number | null)[]
  }
  error?: boolean
  reason?: string
}

async function callOpenMeteo(url: string, source: string): Promise<MeteoJour[]> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
    cache: 'no-store',
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Open-Meteo (${source}) → HTTP ${res.status}. ${text.slice(0, 200)}`)

  let doc: OpenMeteoDaily
  try {
    doc = JSON.parse(text)
  } catch {
    throw new Error(`Open-Meteo (${source}) : réponse non-JSON.`)
  }
  if (doc.error) throw new Error(`Open-Meteo (${source}) : ${doc.reason ?? 'erreur'}`)

  const d = doc.daily
  const jours = d?.time ?? []
  return jours.map((jour, i) => ({
    jour,
    weather_code: d?.weather_code?.[i] ?? null,
    t_max: d?.temperature_2m_max?.[i] ?? null,
    t_min: d?.temperature_2m_min?.[i] ?? null,
    precipitation: d?.precipitation_sum?.[i] ?? null,
    vent_max: d?.wind_speed_10m_max?.[i] ?? null,
    source,
  }))
}

const base = (host: string) =>
  `https://${host}/v1/${host.startsWith('archive') ? 'archive' : 'forecast'}` +
  `?latitude=${LEVANT.latitude}&longitude=${LEVANT.longitude}` +
  `&daily=${DAILY_VARS}&timezone=${encodeURIComponent(LEVANT.timezone)}`

// Historique (ERA5). `end` doit rester à ~5 jours du présent.
export const fetchArchive = (start: string, end: string) =>
  callOpenMeteo(`${base('archive-api.open-meteo.com')}&start_date=${start}&end_date=${end}`, 'archive')

// Fenêtre récente + prévisions courtes
export const fetchRecent = (pastDays = 10, forecastDays = 7) =>
  callOpenMeteo(
    `${base('api.open-meteo.com')}&past_days=${pastDays}&forecast_days=${forecastDays}`,
    'forecast',
  )
