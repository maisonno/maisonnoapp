type StatsMois = { mois: string; entrees: number; sorties: number }

type Props = {
  solde: number
  stats: StatsMois[]
}

const MOIS_LABELS = ['', 'jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']

export default function PoireStats({ solde, stats }: Props) {
  const maxVal = Math.max(...stats.flatMap((s) => [s.entrees, s.sorties]), 1)

  return (
    <div className="space-y-6">
      {/* Solde */}
      <div className="text-center py-6 bg-slate-900 rounded-2xl border border-slate-800">
        <div className="text-sm text-slate-400 mb-1">Solde Poire — saison {new Date().getFullYear()}</div>
        <div className={`text-5xl font-bold ${solde >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {solde.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </div>
      </div>

      {/* Graphe mensuel */}
      {stats.length > 0 && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
          <h3 className="text-xs text-slate-400 uppercase tracking-wide mb-4">Mensuel</h3>
          <div className="flex items-end gap-2 h-28">
            {stats.map((s) => {
              const month = parseInt(s.mois.split('-')[1])
              return (
                <div key={s.mois} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex gap-0.5 items-end h-20 w-full">
                    <div
                      className="flex-1 bg-emerald-700 rounded-t"
                      style={{ height: `${(s.entrees / maxVal) * 100}%` }}
                    />
                    <div
                      className="flex-1 bg-red-800 rounded-t"
                      style={{ height: `${(s.sorties / maxVal) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">{MOIS_LABELS[month]}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-700 rounded" /><span className="text-xs text-slate-400">Entrées</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-800 rounded" /><span className="text-xs text-slate-400">Sorties</span></div>
          </div>
        </div>
      )}
    </div>
  )
}
