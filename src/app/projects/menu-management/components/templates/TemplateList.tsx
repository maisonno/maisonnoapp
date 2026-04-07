'use client'

import { useState } from 'react'
import type { Template } from '../../lib/types'
import TemplateCard from './TemplateCard'
import TemplateFormModal from './TemplateFormModal'

type Props = {
  templates: Template[]
}

export default function TemplateList({ templates }: Props) {
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div>
      <div className="mb-6 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
        <p className="font-medium mb-1">Comment ça marche</p>
        <p>Uploadez vos fichiers <strong>.docx</strong> avec les balises <code>{'{plats}'}</code>, <code>{'{desserts}'}</code>… Voir le guide dans la documentation.</p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">{templates.length} modèle(s)</p>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nouveau modèle
        </button>
      </div>

      <div className="space-y-2">
        {templates.map((t) => <TemplateCard key={t.id} template={t} />)}

        {templates.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">Aucun modèle. Créez-en un pour générer des documents.</p>
          </div>
        )}
      </div>

      {showCreate && <TemplateFormModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
