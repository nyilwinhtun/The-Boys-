import { useEffect, useState, type ChangeEvent } from 'react'
import {
  AlertTriangle, Archive, CheckCircle2, DatabaseBackup, Download,
  RefreshCw, RotateCcw, Settings2, Upload, Warehouse,
} from 'lucide-react'
import {
  createLocalBackup,
  getLocalRecordCounts,
  parseLocalBackupText,
  restoreLocalBackup,
  type LocalBackupSnapshot,
  type LocalRecordCounts,
} from './backupService'
import {
  listLocations,
  setLocationArchived,
  updateLocation,
  updateWarehouse,
  type LocationWithWarehouses,
} from '../warehouse/warehouseService'

const cardClass = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30 sm:p-5'
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
const lightButtonClass = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50'

type LocalRecordCountKey =
  | 'products'
  | 'variants'
  | 'branches'
  | 'warehouses'
  | 'imeiUnits'
  | 'imeiRegistry'
  | 'stockLedger'
  | 'auditLogs'
  | 'syncOutbox'
  | 'appMeta'

const countLabels: Array<[LocalRecordCountKey, string]> = [
  ['products', 'Products'],
  ['variants', 'Variants'],
  ['branches', 'Branches'],
  ['warehouses', 'Warehouses'],
  ['imeiUnits', 'Phone IMEI units'],
  ['imeiRegistry', 'IMEI registry'],
  ['stockLedger', 'Stock movements'],
  ['auditLogs', 'Audit logs'],
  ['syncOutbox', 'Sync outbox'],
  ['appMeta', 'App settings'],
]

export function SettingsPage() {
  const [counts, setCounts] = useState<LocalRecordCounts | null>(null)
  const [locations, setLocations] = useState<LocationWithWarehouses[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [backupDownloaded, setBackupDownloaded] = useState(false)
  const [backupCandidate, setBackupCandidate] = useState<LocalBackupSnapshot | null>(null)
  const [backupFileName, setBackupFileName] = useState('')
  const [fileError, setFileError] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const [restoreComplete, setRestoreComplete] = useState(false)

  async function reload() {
    setLoading(true)
    setError('')
    try {
      const [nextCounts, nextLocations] = await Promise.all([
        getLocalRecordCounts(),
        listLocations(),
      ])
      setCounts(nextCounts)
      setLocations(nextLocations)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load local setup data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [])

  async function downloadBackup() {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const snapshot = await createLocalBackup()
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `the-boys-mobile-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setBackupDownloaded(true)
      setNotice('Local backup file export was started. Keep the downloaded JSON file somewhere safe.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create a local backup.')
    } finally {
      setBusy(false)
    }
  }

  async function handleBackupFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setBackupCandidate(null)
    setBackupFileName('')
    setFileError('')
    setRestoreComplete(false)
    setAcknowledged(false)
    setConfirmationText('')
    if (!file) return

    if (file.size > 50 * 1024 * 1024) {
      setFileError('Backup file is larger than 50 MB. Please use a smaller valid backup file.')
      return
    }

    try {
      const parsed = parseLocalBackupText(await file.text())
      setBackupCandidate(parsed)
      setBackupFileName(file.name)
    } catch (cause) {
      setFileError(cause instanceof Error ? cause.message : 'Could not validate this backup file.')
    }
  }

  async function handleRestore() {
    if (!backupCandidate || !backupDownloaded || !acknowledged || confirmationText.trim() !== 'RESTORE') return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await restoreLocalBackup(backupCandidate)
      setRestoreComplete(true)
      setNotice('Restore completed successfully. Reload the app to use the restored local data.')
      await reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Restore failed. Existing data was not replaced if the transaction rolled back.')
    } finally {
      setBusy(false)
    }
  }

  async function handleEditLocation(location: LocationWithWarehouses) {
    const code = window.prompt('ဆိုင် Code (ဥပမာ BR01)', location.branch.code)
    if (code === null) return
    const name = window.prompt('ဆိုင်အမည် (ဥပမာ Shop 1)', location.branch.name)
    if (name === null) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await updateLocation({ id: location.branch.id, code, name })
      setNotice('Branch information updated. A legacy Main Warehouse record is converted to a shop branch when saved.')
      await reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this branch.')
    } finally {
      setBusy(false)
    }
  }

  async function handleEditWarehouse(warehouse: LocationWithWarehouses['warehouses'][number]) {
    const code = window.prompt('Warehouse Code (ဥပမာ WH-BR01)', warehouse.code)
    if (code === null) return
    const name = window.prompt('Warehouse အမည်', warehouse.name)
    if (name === null) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await updateWarehouse({ id: warehouse.id, code, name })
      setNotice('Warehouse information updated.')
      await reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this warehouse.')
    } finally {
      setBusy(false)
    }
  }

  async function handleArchive(location: LocationWithWarehouses, archived: boolean) {
    const action = archived ? 'archive' : 'restore'
    const accepted = window.confirm(
      archived
        ? `Archive "${location.branch.name}"? Records will be kept. A branch with stock movement history cannot be archived.`
        : `Restore "${location.branch.name}" and its archived warehouses?`,
    )
    if (!accepted) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await setLocationArchived(location.branch.id, archived)
      setNotice(archived ? 'Branch archived. Existing records were kept.' : 'Branch restored.')
      await reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not ${action} this branch.`)
    } finally {
      setBusy(false)
    }
  }

  const totalRecords = countLabels.reduce<number>(
    (total, [key]) => total + (counts?.[key] ?? 0),
    0,
  )

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">System setup</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Settings & data safety</h1>
        <p className="mt-1 text-sm text-slate-500">Local database backup, restore and branch setup.</p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
        <AlertTriangle size={19} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold">Development / local preview notice</p>
          <p className="mt-1 text-xs leading-5">
            ဒီ Project မှာ လက်ရှိ Local IndexedDB ကိုသာ အသုံးပြုနေပါတယ်။ Backup ဖိုင်က ဒီ Device ရဲ့ Local Data ကိုသာ ကူးသိမ်းပေးပြီး Firebase Cloud Sync မဟုတ်သေးပါ။ Login နဲ့ Owner-only permission လည်း မချိတ်ဆက်ရသေးတဲ့အတွက် ဒီ Settings စာမျက်နှာကို လက်ရှိမှာ လုံခြုံရေးအရ Owner-only ဟု မယူဆပါနှင့်။
          </p>
        </div>
      </div>

      {(notice || error) && (
        <div role="status" className={`flex items-start gap-2 rounded-xl border p-3 text-xs leading-5 ${error ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
          {error ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
          <div className="flex-1">{error || notice}</div>
          <button type="button" onClick={() => { setNotice(''); setError('') }} aria-label="Dismiss">×</button>
        </div>
      )}

      <section className={cardClass}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><DatabaseBackup size={19} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-slate-900">Local Database Backup</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Products, variants, branches, warehouses, IMEI records, stock ledger, audit logs, sync queue နဲ့ app settings အားလုံးကို JSON ဖိုင်တစ်ခုအဖြစ် သိမ်းနိုင်ပါတယ်။
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {countLabels.map(([key, label]) => (
            <div key={key} className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{counts ? counts[key].toLocaleString() : '—'}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">{loading ? 'Reading local database…' : `${totalRecords.toLocaleString()} local records on this device`}</p>
          <button type="button" className={buttonClass} onClick={() => void downloadBackup()} disabled={busy || loading}>
            <Download size={16} /> {busy ? 'Working…' : 'Download Backup'}
          </button>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700"><Upload size={19} /></span>
          <div>
            <h2 className="font-bold text-slate-900">Restore Local Database</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Restore လုပ်ခြင်းသည် လက်ရှိ Device ထဲက Local Tables အားလုံးကို ရွေးထားသော Backup နဲ့ အစားထိုးပါမယ်။ မလုပ်ခင် လက်ရှိ Backup ကို Download လုပ်ထားပါ။
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-slate-600">
            Select backup JSON file
            <input type="file" accept=".json,application/json" onChange={(event) => void handleBackupFile(event)} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700" />
          </label>
          {fileError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{fileError}</p>}
          {backupCandidate && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <p className="text-xs font-bold text-emerald-900">Backup validated: {backupFileName}</p>
              <p className="mt-1 text-[11px] text-emerald-800">Exported: {new Date(backupCandidate.exportedAt).toLocaleString()} · Database schema v{backupCandidate.schemaVersion}</p>
              <p className="mt-1 text-[11px] text-emerald-800">Products {backupCandidate.data.products.length} · Branches {backupCandidate.data.branches.length} · IMEI units {backupCandidate.data.imeiUnits.length} · Stock movements {backupCandidate.data.stockLedger.length}</p>
            </div>
          )}
          <label className="flex items-start gap-2 text-xs leading-5 text-slate-600">
            <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-0.5" />
            လက်ရှိ Device ရဲ့ Data အားလုံးကို Backup ဖိုင်နဲ့ အစားထိုးမယ်ဆိုတာ နားလည်ပါတယ်။
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            အတည်ပြုရန် RESTORE ဟု ရိုက်ထည့်ပါ
            <input value={confirmationText} onChange={(event) => setConfirmationText(event.target.value)} placeholder="RESTORE" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold tracking-wider outline-none focus:border-rose-400" />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-[11px] text-slate-500">{backupDownloaded ? 'Current backup download was started in this session.' : 'Download a current backup first to enable restore.'}</p>
            <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => void handleRestore()} disabled={busy || !backupCandidate || !backupDownloaded || !acknowledged || confirmationText.trim() !== 'RESTORE'}>
              <RotateCcw size={15} /> Replace & Restore
            </button>
          </div>
          {restoreComplete && <button type="button" className={buttonClass} onClick={() => window.location.reload()}>Reload app with restored data</button>}
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Warehouse size={19} /></span>
            <div>
              <h2 className="font-bold text-slate-900">Branch & warehouse setup</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">ရှိပြီးသား Location များကို မဖျက်ဘဲ Code / အမည် ပြင်ခြင်း၊ Archive / Restore ပြုလုပ်နိုင်ပါတယ်။ Main Warehouse အဟောင်းကို ပြင်ဆင်သိမ်းဆည်းတဲ့အခါ Shop Branch အဖြစ် ပြောင်းပေးပါမယ်။</p>
            </div>
          </div>
          <button type="button" className={lightButtonClass} onClick={() => void reload()} disabled={busy}><RefreshCw size={14} /> Refresh</button>
        </div>

        {locations.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center">
            <Settings2 size={22} className="mx-auto text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-700">No branch records yet</p>
            <p className="mt-1 text-xs text-slate-500">Warehouse menu မှာ Shop 1 နဲ့ Shop 2 ကို ဖန်တီးနိုင်ပါတယ်။</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {locations.map((location) => (
              <article key={location.branch.id} className={`rounded-xl border p-4 ${location.branch.status === 'ARCHIVED' ? 'border-slate-200 bg-slate-50/70' : 'border-slate-200'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{location.branch.name}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{location.branch.code} · {location.branch.type === 'MAIN_WAREHOUSE' ? 'Legacy Main Warehouse' : 'Shop Branch'}</p>
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${location.branch.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{location.branch.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={lightButtonClass} onClick={() => void handleEditLocation(location)} disabled={busy}>Edit / Convert</button>
                    {location.branch.status === 'ACTIVE' ? (
                      <button type="button" className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50" onClick={() => void handleArchive(location, true)} disabled={busy}><Archive size={13} /> Archive</button>
                    ) : (
                      <button type="button" className={lightButtonClass} onClick={() => void handleArchive(location, false)} disabled={busy}><RotateCcw size={13} /> Restore</button>
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {location.warehouses.map((warehouse) => (
                    <div key={warehouse.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800">{warehouse.name}</p>
                        <p className="text-[10px] text-slate-500">{warehouse.code} · {warehouse.status}</p>
                      </div>
                      <button type="button" className={lightButtonClass} onClick={() => void handleEditWarehouse(warehouse)} disabled={busy}>Edit warehouse</button>
                    </div>
                  ))}
                  {location.warehouses.length === 0 && <p className="text-xs text-slate-400">No warehouse records are attached to this branch.</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="text-[11px] leading-5 text-slate-400">
        Backup ဖိုင်ကို အခြားသူများ မရယူနိုင်သော နေရာတွင် သိမ်းပါ။ ဒီ Restore က လက်ရှိ Browser Device တစ်ခုရဲ့ Local Database ကိုသာ ပြန်တင်ပေးတာဖြစ်ပြီး အခြားဆိုင် Device များသို့ မပို့ပါ။
      </p>
    </div>
  )
}
