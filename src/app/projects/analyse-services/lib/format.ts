// Formatage fr-FR — réplique des helpers du HTML de référence

export const EUR = (v: number) =>
  (v || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'

export const EUR2 = (v: number) =>
  (v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

export const PCT = (v: number) =>
  (v || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' %'

export const N1 = (v: number) =>
  (v || 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 })

export const INT = (v: number) => (v || 0).toLocaleString('fr-FR')

const DOW = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export const frDate = (iso: string) => {
  const d = new Date(iso + 'T12:00:00')
  return DOW[d.getDay()] + ' ' + d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export const frDMY = (iso: string) => {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const frMD = (iso: string) => {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}
