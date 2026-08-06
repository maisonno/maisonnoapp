'use client'

import { useActionState } from 'react'
import { testComboConnection, type ComboProbeState } from '../actions'

const SUGGESTIONS = ['v1/employees', 'v1/contracts', 'v1/shifts', 'employees', 'api/v1/employees']

export default function ComboProbe() {
  const [state, action, pending] = useActionState(testComboConnection, {} as ComboProbeState)
  const ok = state.results?.find((r) => r.ok)

  return (
    <section>
      <div className="h2">
        Connexion ComboHR <span className="tag">diagnostic</span>
      </div>

      <form action={action} className="frm">
        <div style={{ gridColumn: '1 / -1' }}>
          <label>Chemin à sonder</label>
          <input name="path" defaultValue="v1/employees" list="combo-paths" />
          <datalist id="combo-paths">
            {SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Test en cours…' : 'Tester la connexion'}
          </button>
        </div>
      </form>

      {state.error && <div className="msg-err">{state.error}</div>}

      {ok && (
        <div className="msg-ok">
          ✅ Combinaison fonctionnelle : <b>{ok.base}</b> · authentification <b>{ok.scheme}</b>. Renseigne
          <code> COMBO_API_BASE_URL={ok.base}</code> et <code> COMBO_AUTH_SCHEME={ok.scheme}</code> dans Vercel.
        </div>
      )}

      {state.results && state.results.length > 0 && (
        <div className="daily">
          <table className="day">
            <thead>
              <tr>
                <th>Base</th>
                <th>Auth</th>
                <th>Statut</th>
                <th>Réponse (extrait)</th>
              </tr>
            </thead>
            <tbody>
              {state.results.map((r, i) => (
                <tr key={i} style={{ background: r.ok ? 'rgba(122,154,60,.12)' : undefined }}>
                  <td>{r.base}</td>
                  <td>{r.scheme}</td>
                  <td>{r.status ?? '—'}</td>
                  <td style={{ maxWidth: 420 }}>
                    <code style={{ fontSize: 11, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                      {r.error ? `⚠️ ${r.error}` : r.excerpt.slice(0, 300) || '(vide)'}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {state.results && state.results.length > 0 && !ok && (
        <div className="foot">
          Aucune combinaison n&apos;a répondu 2xx. Un <b>401/403</b> signifie que l&apos;URL est bonne mais que le
          schéma d&apos;authentification ou la clé ne convient pas ; un <b>404</b> que le chemin n&apos;existe pas
          (essaie un autre chemin) ; une <b>erreur réseau</b> que l&apos;hôte n&apos;est pas le bon. Le plus
          rapide reste de m&apos;envoyer la documentation technique de la Partner API fournie par Combo.
        </div>
      )}
    </section>
  )
}
