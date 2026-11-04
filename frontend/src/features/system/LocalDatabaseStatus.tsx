import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Database, RefreshCw } from 'lucide-react'
import { checkLocalDatabaseHealth, type LocalDatabaseHealth } from '../../data/local'

type CheckState = 'checking' | 'ready' | 'error'

export function LocalDatabaseStatus() {
  const [state, setState] = useState<CheckState>('checking')
  const [health, setHealth] = useState<LocalDatabaseHealth | null>(null)
  const [error, setError] = useState('')

  const runCheck = async () => {
    setState('checking')
    setError('')
    try {
      const result = await checkLocalDatabaseHealth()
      setHealth(result)
      setState('ready')
    } catch (cause) {
      setHealth(null)
      setError(cause instanceof Error ? cause.message : 'Unknown local database error.')
      setState('error')
    }
  }

  useEffect(() => {
    void runCheck()
  }, [])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Database size={19} /></span>
          <div>
            <h2 className="font-bold text-slate-900">Local database</h2>
            <p className="mt-1 text-xs text-slate-500">Dexie.js · IndexedDB · Device storage</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void runCheck()}
          disabled={state === 'checking'}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw size={14} className={state === 'checking' ? 'animate-spin' : ''} />
          Test again
        </button>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-4" aria-live="polite">
        {state === 'checking' && <p className="text-sm font-medium text-slate-600">Checking local database…</p>}
        {state === 'ready' && health && (
          <>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-700"><CheckCircle2 size={17} /> Local database ready</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">{health.message}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Schema version</p><p className="mt-1 text-sm font-bold text-slate-800">{health.version}</p></div>
              <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tables</p><p className="mt-1 text-sm font-bold text-slate-800">{health.tableCount}</p></div>
              <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Products</p><p className="mt-1 text-sm font-bold text-slate-800">{health.productCount}</p></div>
              <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pending sync</p><p className="mt-1 text-sm font-bold text-slate-800">{health.pendingSyncCount}</p></div>
            </div>
            <p className="mt-3 text-[10px] text-slate-400">Last checked: {new Date(health.checkedAt).toLocaleString()}</p>
          </>
        )}
        {state === 'error' && (
          <div className="flex items-start gap-2 text-sm text-rose-700"><AlertCircle size={17} className="mt-0.5 shrink-0" /><div><p className="font-bold">Local database unavailable</p><p className="mt-1 text-xs leading-5">{error}</p></div></div>
        )}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-slate-400">This test verifies that this browser can open IndexedDB and save/read a local system check. It does not create sample products or connect cloud sync yet.</p>
    </section>
  )
}
