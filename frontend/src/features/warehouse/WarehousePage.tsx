import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Plus, Warehouse, X } from 'lucide-react'
import type { BranchType } from '../../data/local'
import {
  createLocation,
  listLocations,
  type CreateLocationInput,
  type LocationWithWarehouses,
} from './warehouseService'

const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
const labelClass = 'block text-xs font-semibold text-slate-600'
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60'
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50'

function ModalFrame({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-label={title} className="app-scrollbar max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><h2 className="text-lg font-bold text-slate-900">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p></div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {children}
      </section>
    </div>
  )
}

function LocationForm({ onClose, onSave }: { onClose: () => void; onSave: (input: CreateLocationInput) => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const text = (key: string) => String(form.get(key) ?? '').trim()
    try {
      await onSave({
        type: text('type') as BranchType,
        code: text('code'),
        name: text('name'),
        warehouseCode: text('warehouseCode'),
        warehouseName: text('warehouseName'),
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this location.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalFrame title="Add shop branch" subtitle="Create a shop branch and its first stock location. This does not add stock." onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <input type="hidden" name="type" value="BRANCH" />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>Location code *<input className={inputClass} name="code" required maxLength={24} placeholder="e.g. BR01 or MAIN" /></label>
          <label className={labelClass}>Location name *<input className={inputClass} name="name" required maxLength={80} placeholder="e.g. Branch A" /></label>
          <label className={labelClass}>First warehouse code *<input className={inputClass} name="warehouseCode" required maxLength={24} placeholder="e.g. WH-BR01" /></label>
          <label className={labelClass}>First warehouse name *<input className={inputClass} name="warehouseName" required maxLength={80} placeholder="e.g. Branch A Store" /></label>
        </div>
        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className={secondaryButton} onClick={onClose}>Cancel</button><button type="submit" className={primaryButton} disabled={saving}>{saving ? 'Saving…' : 'Create location'}</button></div>
      </form>
    </ModalFrame>
  )
}

export function WarehousePage() {
  const [locations, setLocations] = useState<LocationWithWarehouses[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function reload() {
    setLoading(true)
    setError('')
    try {
      setLocations(await listLocations())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load local warehouse records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [])

  async function saveLocation(input: CreateLocationInput) {
    await createLocation(input)
    setDialogOpen(false)
    setNotice('Location and its first warehouse were saved on this device. No stock was added.')
    await reload()
  }

  const activeLocations = locations.filter(({ branch }) => branch.status === 'ACTIVE')
  const activeWarehouseCount = activeLocations.reduce((total, item) => total + item.warehouses.filter((warehouse) => warehouse.status === 'ACTIVE').length, 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Inventory setup</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Warehouse & locations</h1>
          <p className="mt-1 text-sm text-slate-500">Set up where stock will be stored before registering IMEIs or quantities.</p>
        </div>
        <button type="button" className={primaryButton} onClick={() => setDialogOpen(true)}><Plus size={16} /> Add location</button>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
        <div className="flex items-start gap-3"><Warehouse size={19} className="mt-0.5 shrink-0 text-blue-700" /><div><p className="text-sm font-bold text-blue-950">Location setup only</p><p className="mt-1 text-xs leading-5 text-blue-800">Each shop branch has its own stock location. Creating it does not increase stock. Creating it does not increase stock. Stock movements will be recorded separately in the next inventory step.</p></div></div>
      </div>

      {(notice || error) && <div role="status" className={`flex items-start gap-2 rounded-xl border p-3 text-xs leading-5 ${error ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}><CheckCircle2 size={16} className="mt-0.5 shrink-0" /><div className="flex-1">{error || notice}</div><button type="button" aria-label="Dismiss message" onClick={() => { setNotice(''); setError('') }}><X size={14} /></button></div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-bold text-slate-900">Configured locations</h2><p className="mt-1 text-xs text-slate-500">{activeLocations.length} active locations · {activeWarehouseCount} active warehouses</p></div>
          <button type="button" className={secondaryButton} onClick={() => void reload()}>Refresh list</button>
        </div>
        {loading ? <p className="py-10 text-center text-sm text-slate-500">Loading locations…</p> : activeLocations.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Warehouse size={22} /></span><p className="mt-3 text-sm font-bold text-slate-800">No locations configured</p><p className="mt-1 max-w-md text-xs leading-5 text-slate-400">Start by creating Shop 1 and Shop 2. Each shop needs a unique branch code and its first stock location.</p><button type="button" className={`${primaryButton} mt-4`} onClick={() => setDialogOpen(true)}><Plus size={15} /> Set up first location</button></div>
        ) : (
          <div className="space-y-3">
            {activeLocations.map(({ branch, warehouses }) => (
              <article key={branch.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-bold text-slate-900">{branch.name}</p><p className="mt-1 text-[11px] text-slate-500">{branch.code} · {branch.type === 'MAIN_WAREHOUSE' ? 'Main warehouse' : 'Branch'}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Active</span></div>
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {warehouses.filter((warehouse) => warehouse.status === 'ACTIVE').map((warehouse) => (
                    <div key={warehouse.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2"><Warehouse size={14} className="text-slate-500" /><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{warehouse.name}</p><p className="text-[10px] text-slate-500">{warehouse.code}</p></div></div>
                  ))}
                  {warehouses.every((warehouse) => warehouse.status !== 'ACTIVE') && <p className="text-xs text-slate-400">No active warehouse assigned.</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {dialogOpen && <LocationForm onClose={() => setDialogOpen(false)} onSave={saveLocation} />}
    </div>
  )
}
