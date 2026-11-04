import {
  ArrowDownRight, ArrowUpRight, Boxes, CircleDollarSign, Clock3,
  PackageSearch, Plus, RefreshCw, ShoppingBag, Truck,
} from 'lucide-react'
import { LocalDatabaseStatus } from '../system/LocalDatabaseStatus'

const metrics = [
  { label: 'Today sales', value: '—', note: 'Connect sales data in a later phase', icon: CircleDollarSign },
  { label: 'Gross profit', value: '—', note: 'Costing engine not connected', icon: ArrowUpRight },
  { label: 'Items in stock', value: '—', note: 'Waiting for inventory database', icon: Boxes },
  { label: 'Pending transfers', value: '—', note: 'Transfer workflow not connected', icon: Truck },
]

const quickActions = [
  { title: 'New sale', description: 'Open the point of sale', icon: ShoppingBag },
  { title: 'Add product', description: 'Create a product record', icon: Plus },
  { title: 'Receive stock', description: 'Record a warehouse receipt', icon: PackageSearch },
  { title: 'Sync status', description: 'Review local and cloud sync', icon: RefreshCw },
]

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Business overview</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Good day, Owner</h1>
          <p className="mt-1 text-sm text-slate-500">Here is your shop management workspace.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
          <Clock3 size={14} /> Data period: Today
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">{metric.label}</span>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${index === 0 ? 'bg-blue-50 text-blue-700' : index === 1 ? 'bg-emerald-50 text-emerald-700' : index === 2 ? 'bg-violet-50 text-violet-700' : 'bg-amber-50 text-amber-700'}`}>
                  <Icon size={18} />
                </span>
              </div>
              <div className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{metric.value}</div>
              <p className="mt-1 text-[11px] leading-5 text-slate-400">{metric.note}</p>
            </article>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">Sales overview</h2>
              <p className="mt-1 text-xs text-slate-500">Sales charts will appear after the POS and database phases.</p>
            </div>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">No live data</span>
          </div>
          <div className="mt-6 flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm"><ShoppingBag size={21} /></div>
            <p className="mt-3 text-sm font-semibold text-slate-700">Your sales chart will be displayed here</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">This preview does not use sample sales figures. Real totals will be connected to approved sales transactions.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
          <div className="flex items-center justify-between">
            <div><h2 className="font-bold text-slate-900">System readiness</h2><p className="mt-1 text-xs text-slate-500">Foundation stage</p></div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">Phase 2.1</span>
          </div>
          <div className="mt-5 space-y-4">
            {[
              ['React application shell', 'Ready', 'good'],
              ['Responsive navigation', 'Ready', 'good'],
              ['Firebase authentication', 'Next phase', 'pending'],
              ['Cloud sync engine', 'Planned', 'pending'],
            ].map(([label, status, tone]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-600">{label}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${tone === 'good' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{status}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl bg-slate-900 p-4 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold"><RefreshCw size={15} /> Sync engine</div>
            <p className="mt-1 text-xs leading-5 text-slate-300">Not connected yet. Local commands will be queued for a later secure cloud-sync phase.</p>
          </div>
        </section>
      </div>

      <LocalDatabaseStatus />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div><h2 className="font-bold text-slate-900">Quick actions</h2><p className="mt-1 text-xs text-slate-500">Workflow entry points for the upcoming modules.</p></div>
          <span className="text-[11px] font-medium text-slate-400">Preview only</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <div key={action.title} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon size={18} /></span>
                <div className="min-w-0"><p className="text-sm font-bold text-slate-800">{action.title}</p><p className="mt-0.5 text-[11px] leading-4 text-slate-400">{action.description}</p></div>
                <ArrowDownRight size={15} className="ml-auto shrink-0 rotate-[-45deg] text-slate-300" />
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
