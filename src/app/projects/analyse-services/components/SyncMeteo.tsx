'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { syncMeteo, type MeteoSyncState } from '../actions'

export default function SyncMeteo() {
  const [state, setState] = useState<MeteoSyncState>({})
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const run = () => {
    setState({})
    startTransition(async () => {
      const res = await syncMeteo()
      setState(res)
      if (res.success) router.refresh()
    })
  }

  return (
    <div className="scdimport">
      <div className="txt">
        <b>🌤️ Météo de l&apos;Île du Levant</b>
        <small>
          Récupère la météo quotidienne (Open-Meteo, sans clé) depuis le premier jour de ventes jusqu&apos;aux
          prévisions à 7 jours, et l&apos;affiche en pictogramme dans le tableau jour par jour. Ré-exécutable à
          volonté : les jours déjà chargés sont mis à jour.
        </small>
      </div>
      <button className="btn btn-primary" type="button" onClick={run} disabled={pending}>
        {pending ? 'Synchro en cours…' : 'Synchroniser la météo'}
      </button>
      {state.error && <div className="msg-err" style={{ flexBasis: '100%', margin: 0 }}>{state.error}</div>}
      {state.success && (
        <div className="msg-ok" style={{ flexBasis: '100%', margin: 0 }}>
          {state.success}
          {state.periode ? ` (${state.periode})` : ''}
        </div>
      )}
    </div>
  )
}
