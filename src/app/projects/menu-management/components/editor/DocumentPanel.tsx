'use client'

import { useState } from 'react'
import type { GeneratedDoc, TemplateName } from '../../lib/types'
import { TEMPLATE_LABELS } from '../../lib/types'

type Props = {
  menuId: string
  docs: GeneratedDoc[]
}

const TEMPLATES: TemplateName[] = ['menu-table', 'affiche-facade', 'grande-affiche']

type GenerateState = 'idle' | 'loading' | 'error'

export default function DocumentPanel({ menuId, docs }: Props) {
  const [states, setStates] = useState<Record<TemplateName, GenerateState>>({
    'menu-table': 'idle',
    'affiche-facade': 'idle',
    'grande-affiche': 'idle',
  })
  const [errors, setErrors] = useState<Record<TemplateName, string>>({
    'menu-table': '',
    'affiche-facade': '',
    'grande-affiche': '',
  })
  const [freshDocs, setFreshDocs] = useState<GeneratedDoc[]>(docs)

  const latestDoc = (template: TemplateName) =>
    freshDocs
      .filter((d) => d.template_name === template)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

  const handleGenerate = async (template: TemplateName) => {
    setStates((s) => ({ ...s, [template]: 'loading' }))
    setErrors((e) => ({ ...e, [template]: '' }))

    try {
      const res = await fetch('/projects/menu-management/api/generate-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuId, template }),
      })

      const data = await res.json() as { error?: string; doc?: GeneratedDoc }

      if (!res.ok || data.error) {
        setErrors((e) => ({ ...e, [template]: data.error ?? 'Erreur de génération.' }))
        setStates((s) => ({ ...s, [template]: 'error' }))
        return
      }

      if (data.doc) {
        setFreshDocs((prev) => [data.doc!, ...prev])
      }
      setStates((s) => ({ ...s, [template]: 'idle' }))
    } catch {
      setErrors((e) => ({ ...e, [template]: 'Erreur réseau.' }))
      setStates((s) => ({ ...s, [template]: 'error' }))
    }
  }

  return (
    <div className="space-y-3">
      {TEMPLATES.map((template) => {
        const doc = latestDoc(template)
        const state = states[template]
        const error = errors[template]

        return (
          <div key={template} className="rounded-lg border bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm text-gray-800">{TEMPLATE_LABELS[template]}</p>
                {doc && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Généré le {new Date(doc.created_at).toLocaleString('fr-FR')}
                    {' · '}expire le {new Date(doc.expires_at).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {doc?.pdf_path && (
                  <a
                    href={doc.pdf_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                  >
                    PDF ↗
                  </a>
                )}
                {doc?.docx_path && (
                  <a
                    href={doc.docx_path}
                    download
                    className="rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    DOCX ↓
                  </a>
                )}
                <button
                  onClick={() => handleGenerate(template)}
                  disabled={state === 'loading'}
                  className="rounded-md bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  {state === 'loading' ? 'Génération…' : doc ? 'Regénérer' : 'Générer'}
                </button>
              </div>
            </div>

            {error && (
              <p className="mt-2 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-700">{error}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
