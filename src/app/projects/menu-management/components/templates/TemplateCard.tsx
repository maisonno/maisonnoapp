'use client'

import { useState, useTransition } from 'react'
import { deleteTemplate, updateTemplate } from '../../actions'
import type { Template } from '../../lib/types'

type Props = {
  template: Template
}

const inputCls = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

export default function TemplateCard({ template }: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleDelete = () => {
    if (!confirm(`Supprimer le modèle « ${template.name} » ?\nLe fichier .docx associé sera aussi supprimé.`)) return
    startTransition(async () => {
      const result = await deleteTemplate(template.id, template.storage_path)
      if (result?.error) alert(result.error)
    })
  }

  const handleSave = () => {
    if (!name.trim()) { setError('Le nom est obligatoire.'); return }
    setError('')
    startTransition(async () => {
      const result = await updateTemplate(template.id, name, description)
      if (result?.error) { setError(result.error); return }
      setEditing(false)
    })
  }

  if (editing) {
    return (
      <div className="rounded-lg border bg-white px-4 py-4 shadow-sm space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={() => { setEditing(false); setName(template.name); setDescription(template.description ?? '') }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={handleSave} disabled={isPending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-sm transition-all hover:shadow-md">
      {/* File icon */}
      <div className="shrink-0 rounded-lg bg-blue-50 p-2.5">
        <DocxIcon />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800">{template.name}</p>
        {template.description && (
          <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          {template.storage_path ? '✓ Fichier uploadé' : '⚠ Aucun fichier'}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="Modifier"
        >
          <PencilIcon />
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          title="Supprimer"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}

function DocxIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  )
}
