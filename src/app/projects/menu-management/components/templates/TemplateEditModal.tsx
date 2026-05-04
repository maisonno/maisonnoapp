'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateTemplate } from '../../actions'
import type { Template } from '../../lib/types'

type Props = {
  template: Template
  onClose: () => void
}

const inputCls = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

export default function TemplateEditModal({ template, onClose }: Props) {
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? '')
  const [flipEvenPages, setFlipEvenPages] = useState(template.flip_even_pages)
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Le nom est obligatoire.'); return }

    setIsLoading(true)
    setError('')

    try {
      let newStoragePath: string | undefined
      const supabase = createClient()

      if (file) {
        const ext = file.name.split('.').pop() ?? 'docx'
        newStoragePath = `${Date.now()}-${name.trim().toLowerCase().replace(/\s+/g, '-')}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('templates')
          .upload(newStoragePath, file, {
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            upsert: false,
          })

        if (uploadErr) {
          setError(`Erreur upload : ${uploadErr.message}`)
          setIsLoading(false)
          return
        }
      }

      startTransition(async () => {
        const result = await updateTemplate(
          template.id,
          name.trim(),
          description,
          flipEvenPages,
          newStoragePath,
          newStoragePath ? (template.storage_path ?? undefined) : undefined,
        )

        if (result?.error) {
          // Cleanup if upload succeeded but DB failed
          if (newStoragePath) {
            await supabase.storage.from('templates').remove([newStoragePath])
          }
          setError(result.error)
          setIsLoading(false)
          return
        }

        onClose()
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue.')
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Modifier le modèle</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="flip-even-pages"
              checked={flipEvenPages}
              onChange={(e) => setFlipEvenPages(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="flip-even-pages" className="text-sm text-gray-700">
              Retourner les pages paires (impression R/V paysage sur iOS)
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nouveau fichier .docx
              <span className="ml-1 font-normal text-gray-400">(optionnel — remplace le fichier actuel)</span>
            </label>
            {template.storage_path && !file && (
              <p className="mb-1 text-xs text-gray-500">Fichier actuel : {template.storage_path.replace(/^\d+-/, '')}</p>
            )}
            <input
              type="file"
              accept=".docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && (
              <p className="mt-1 text-xs text-gray-500">{file.name} ({Math.round(file.size / 1024)} Ko)</p>
            )}
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
