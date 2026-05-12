'use client'

import type { Tag } from '../../lib/types'

type Props = {
  form: { date: string; tag_id: string; notes: string }
  set: (field: string, value: unknown) => void
  tags: Tag[]
}

export default function StepService({ form, set, tags }: Props) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Nouveau service</h2>
      <p className="text-xs text-slate-400">
        Renseignez les informations du service, puis appuyez sur Suivant — la fiche sera créée en base.
      </p>

      <div>
        <label className="text-sm text-slate-300 block mb-1">Date du service</label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => set('date', e.target.value)}
          className="input w-full"
        />
      </div>

      <div>
        <label className="text-sm text-slate-300 block mb-1">Tag</label>
        <select
          value={form.tag_id}
          onChange={(e) => set('tag_id', e.target.value)}
          className="input w-full"
        >
          <option value="">— Aucun —</option>
          {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div>
        <label className="text-sm text-slate-300 block mb-1">Commentaires</label>
        <textarea
          value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          placeholder="Observations sur le service…"
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>
    </div>
  )
}
