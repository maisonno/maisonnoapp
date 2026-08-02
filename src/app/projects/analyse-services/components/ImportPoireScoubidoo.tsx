'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { importPoireFromScoubidoo, type ActionState } from '../actions'

export default function ImportPoireScoubidoo() {
  const [state, setState] = useState<ActionState>({})
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const run = () => {
    setState({})
    startTransition(async () => {
      const res = await importPoireFromScoubidoo()
      setState(res)
      if (res.success) router.refresh()
    })
  }

  return (
    <div className="scdimport">
      <div className="txt">
        <b>🍐 Poire depuis Scoubidoo</b>
        <small>
          Récupère directement la Poire saisie dans la mini-app Scoubidoo — plus besoin d&apos;exporter puis
          ré-importer un CSV. Ré-exécutable à volonté : les jours déjà chargés sont mis à jour, pas dupliqués.
        </small>
      </div>
      <button className="btn btn-primary" type="button" onClick={run} disabled={pending}>
        {pending ? 'Import en cours…' : 'Importer la Poire'}
      </button>
      {state.error && <div className="msg-err" style={{ flexBasis: '100%', margin: 0 }}>{state.error}</div>}
      {state.success && <div className="msg-ok" style={{ flexBasis: '100%', margin: 0 }}>{state.success}</div>}
    </div>
  )
}
