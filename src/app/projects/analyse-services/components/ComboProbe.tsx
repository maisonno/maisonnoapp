'use client'

import { useActionState } from 'react'
import {
  loadComboSpec,
  testComboConnection,
  type ComboProbeState,
  type ComboSpecState,
} from '../actions'

const SUGGESTIONS = ['v1/employees', 'v1/contracts', 'v1/shifts', 'employees', 'api/v1/employees']

export default function ComboProbe() {
  const [state, action, pending] = useActionState(testComboConnection, {} as ComboProbeState)
  const ok = state.results?.find((r) => r.ok)

  return (
    <section>
      <div className="h2">
        Connexion ComboHR <span className="tag">diagnostic</span>
      </div>

      <ComboSpec />

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

// ─── Récupération de la spec OpenAPI (exécutée par le serveur) ───

function ComboSpec() {
  const [state, action, pending] = useActionState(loadComboSpec, {} as ComboSpecState)
  const spec = state.spec

  return (
    <div style={{ marginBottom: 22 }}>
      <form action={action} className="frm">
        <div style={{ gridColumn: '1 / -1' }}>
          <label>URL de la spec OpenAPI (vide = essayer les emplacements habituels)</label>
          <input name="url" placeholder="https://partner.combohr.com/swagger.json" />
        </div>
        <div>
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Récupération…' : 'Récupérer la documentation'}
          </button>
        </div>
      </form>

      {state.error && <div className="msg-err">{state.error}</div>}

      {spec && (
        <>
          <div className="msg-ok">
            ✅ {spec.title ?? 'API'} {spec.version ? `v${spec.version}` : ''} — {spec.endpoints.length}{' '}
            endpoint(s) · source <code>{spec.url}</code>
          </div>
          <div className="foot" style={{ marginTop: 0, marginBottom: 10 }}>
            <b>Serveurs :</b> {spec.servers.join(', ') || '—'}
            <br />
            <b>Authentification :</b>{' '}
            {spec.security.length
              ? spec.security
                  .map((s) => `${s.name} (${s.type}${s.in ? `, in: ${s.in}` : ''}${s.scheme ? `, ${s.scheme}` : ''})`)
                  .join(' · ')
              : '—'}
          </div>
          <div className="daily">
            <table className="day">
              <thead>
                <tr>
                  <th>Méthode</th>
                  <th>Chemin</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {spec.endpoints.map((e, i) => (
                  <tr key={i}>
                    <td>{e.method}</td>
                    <td>
                      <code style={{ fontSize: 12 }}>{e.path}</code>
                    </td>
                    <td style={{ color: 'var(--ink-soft)' }}>{e.summary ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {spec.schemas.length > 0 && (
            <div className="foot">
              <b>Objets exposés :</b> {spec.schemas.join(', ')}
            </div>
          )}
        </>
      )}

      {!spec && state.tried && state.tried.length > 0 && (
        <div className="daily">
          <table className="day">
            <thead>
              <tr>
                <th>URL testée</th>
                <th>Statut</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {state.tried.map((t, i) => (
                <tr key={i}>
                  <td>
                    <code style={{ fontSize: 11, wordBreak: 'break-all' }}>{t.url}</code>
                  </td>
                  <td>{t.status ?? '—'}</td>
                  <td style={{ color: 'var(--ink-soft)', fontSize: 12 }}>{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
