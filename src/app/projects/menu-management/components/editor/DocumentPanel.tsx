'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { GeneratedDoc, Template } from '../../lib/types'

type Props = {
  menuId: string
  docs: GeneratedDoc[]
  templates: Template[]
}

type GenerateState = 'idle' | 'loading' | 'error'

export default function DocumentPanel({ menuId, docs, templates }: Props) {
  const [states, setStates] = useState<Record<string, GenerateState>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [freshDocs, setFreshDocs] = useState<GeneratedDoc[]>(docs)

  const latestDoc = (templateId: string) =>
    freshDocs
      .filter((d) => d.template_name === templateId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

  const handleGenerate = async (templateId: string) => {
    setStates((s) => ({ ...s, [templateId]: 'loading' }))
    setErrors((e) => ({ ...e, [templateId]: '' }))

    try {
      const res = await fetch('/projects/menu-management/api/generate-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuId, templateId }),
      })

      const data = await res.json() as { error?: string; doc?: GeneratedDoc }

      if (!res.ok || data.error) {
        setErrors((e) => ({ ...e, [templateId]: data.error ?? 'Erreur de génération.' }))
        setStates((s) => ({ ...s, [templateId]: 'error' }))
        return
      }

      if (data.doc) {
        setFreshDocs((prev) => [data.doc!, ...prev])
      }
      setStates((s) => ({ ...s, [templateId]: 'idle' }))
    } catch {
      setErrors((e) => ({ ...e, [templateId]: 'Erreur réseau.' }))
      setStates((s) => ({ ...s, [templateId]: 'error' }))
    }
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-lg border bg-white px-4 py-8 text-center shadow-sm">
        <p className="text-sm text-gray-400">
          Aucun modèle disponible.{' '}
          <Link href="/projects/menu-management?tab=templates" className="text-blue-600 hover:underline">
            Créez un modèle
          </Link>{' '}
          pour générer des documents.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {templates.map((template) => {
        const doc = latestDoc(template.id)
        const state = states[template.id] ?? 'idle'
        const error = errors[template.id] ?? ''

        return (
          <div key={template.id} className="rounded-lg border bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm text-gray-800">{template.name}</p>
                {template.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                )}
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
                  onClick={() => handleGenerate(template.id)}
                  disabled={state === 'loading' || !template.storage_path}
                  className="rounded-md bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                  title={!template.storage_path ? 'Aucun fichier .docx uploadé pour ce modèle' : undefined}
                >
                  {state === 'loading' ? 'Génération…' : doc ? 'Regénérer' : 'Générer'}
                </button>
              </div>
            </div>

            {!template.storage_path && (
              <p className="mt-2 text-xs text-amber-600">⚠ Aucun fichier .docx pour ce modèle.</p>
            )}

            {error && (
              <p className="mt-2 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-700">{error}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
