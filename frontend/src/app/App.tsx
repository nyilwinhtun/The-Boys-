import { useEffect, useMemo, useState } from 'react'
import {
  Bell, ChevronDown, CircleHelp, Command, Menu, ShieldCheck,
  Smartphone, X,
} from 'lucide-react'
import { registerSW } from 'virtual:pwa-register'
import { navigation, groupLabels, mobileNavigation, type PageKey } from './navigation'
import { StatusPill } from '../components/StatusPill'
import { Dashboard } from '../features/dashboard/Dashboard'
import { InventoryPage } from '../features/inventory/InventoryPage'
import { LoginPreview } from '../features/auth/LoginPreview'
import { ModulePlaceholder } from '../features/placeholder/ModulePlaceholder'

const descriptions: Record<Exclude<PageKey, 'dashboard'>, string> = {
  inventory: 'Product catalog, variants, IMEI tracking, quantity stock, barcode and QR workflows will be implemented in the inventory phase.',
  pos: 'The POS module will support serialized phone sales, accessory quantity sales, split payments, owner-approved discounts and offline allocation rules.',
  purchases: 'Central purchase orders, goods receiving, supplier balances and FIFO / weighted-average costing will be implemented here.',
  warehouse: 'Main warehouse receiving, stock lots, IMEI registration, discrepancy review and inventory controls will be implemented here.',
  transfers: 'Branch requests, approvals, dispatch, in-transit tracking and receiving confirmations will be implemented here.',
  customers: 'Customer profiles, purchase history, credit limits, outstanding balances and payment collections will be implemented here.',
  accounts: 'Cash sessions, KPay / WavePay reconciliation, supplier payments, customer receipts and expenses will be implemented here.',
  reports: 'Branch comparisons, sales trends, gross profit, expenses, receivables, payables and stock valuation will be implemented here.',
  team: 'Owner, Warehouse Manager, Branch Manager, Sales Staff, Stock Staff and Accountant access rules will be implemented here.',
  settings: 'Company setup, branch configuration, device registration, backup preferences and application settings will be implemented here.',
}

export default function App() {
  const [activePage, setActivePage] = useState<PageKey>('dashboard')
  const [online, setOnline] = useState(navigator.onLine)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loginPreview, setLoginPreview] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [applyUpdate, setApplyUpdate] = useState<(() => Promise<void>) | null>(null)

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() { setUpdateAvailable(true) },
      onOfflineReady() { console.info('The Boys Mobile app shell is ready for offline use.') },
    })
    setApplyUpdate(() => updateSW)

    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  const selectedItem = useMemo(
    () => navigation.find((item) => item.key === activePage) ?? navigation[0],
    [activePage],
  )

  const selectPage = (page: PageKey) => {
    setActivePage(page)
    setMobileMenuOpen(false)
    setLoginPreview(false)
  }

  if (loginPreview) return <LoginPreview onBack={() => setLoginPreview(false)} />

  return (
    <div className="min-h-screen bg-[#f4f6fa] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[258px] flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="flex h-[78px] items-center gap-3 border-b border-slate-100 px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-black tracking-tight text-white">TB</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-wide text-slate-950">THE BOYS MOBILE</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400">Management System</p>
            </div>
          </div>

          <div className="mx-4 mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-950"><Smartphone size={15} /> Branch workspace</div>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">BR01 · Branch A</p>
                <p className="mt-0.5 text-[10px] text-slate-500">Initial setup preview</p>
              </div>
              <ChevronDown size={15} className="text-slate-400" />
            </div>
          </div>

          <nav className="app-scrollbar mt-5 flex-1 space-y-6 overflow-y-auto px-3 pb-5">
            {(['main', 'operations', 'management'] as const).map((group) => {
              const items = navigation.filter((item) => item.group === group)
              return (
                <div key={group}>
                  <p className="mb-2 px-3 text-[10px] font-extrabold tracking-[0.16em] text-slate-400">{groupLabels[group]}</p>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const Icon = item.icon
                      const active = activePage === item.key
                      return (
                        <button
                          key={item.key}
                          onClick={() => selectPage(item.key)}
                          className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? 'bg-slate-900 text-white shadow-sm shadow-slate-300' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
                        >
                          <Icon size={17} className={active ? 'text-blue-300' : 'text-slate-400 group-hover:text-slate-600'} />
                          <span className="text-[13px] font-semibold">{item.label}</span>
                          {item.key === 'pos' && <span className={`ml-auto rounded-md px-1.5 py-0.5 text-[9px] font-bold ${active ? 'bg-white/15 text-white' : 'bg-blue-50 text-blue-700'}`}>POS</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </nav>

          <div className="border-t border-slate-100 p-4">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-extrabold text-blue-800">OW</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-800">Owner Preview</p>
                <p className="mt-0.5 text-[10px] text-slate-400">Role UI only</p>
              </div>
              <ShieldCheck size={16} className="text-emerald-600" />
            </div>
          </div>
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/30 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
            <aside className="flex h-full w-[min(84vw,320px)] flex-col bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex h-[72px] items-center justify-between border-b border-slate-100 px-5">
                <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-white">TB</div><span className="text-sm font-extrabold">THE BOYS MOBILE</span></div>
                <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
              </div>
              <nav className="app-scrollbar flex-1 space-y-5 overflow-y-auto p-3">
                {(['main', 'operations', 'management'] as const).map((group) => (
                  <div key={group}>
                    <p className="mb-2 px-3 text-[10px] font-extrabold tracking-widest text-slate-400">{groupLabels[group]}</p>
                    {navigation.filter((item) => item.group === group).map((item) => {
                      const Icon = item.icon
                      return <button key={item.key} onClick={() => selectPage(item.key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${activePage === item.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><Icon size={17}/>{item.label}</button>
                    })}
                  </div>
                ))}
              </nav>
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col lg:pl-[258px]">
          <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => setMobileMenuOpen(true)} aria-label="Open menu" className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"><Menu size={18} /></button>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{selectedItem.label}</p>
                <p className="hidden text-[10px] text-slate-400 sm:block">The Boys Mobile / {selectedItem.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden md:block"><StatusPill online={online} /></div>
              <button aria-label="Help" title="Help" className="hidden rounded-xl p-2 text-slate-500 hover:bg-slate-100 sm:inline-flex"><CircleHelp size={18} /></button>
              <button aria-label="Notifications" title="Notifications" className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100"><Bell size={18} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-600" /></button>
              <div className="hidden h-7 w-px bg-slate-200 sm:block" />
              <button onClick={() => setLoginPreview(true)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-2 py-1.5 hover:bg-slate-50">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-black text-white">OW</span>
                <span className="hidden text-left sm:block"><span className="block text-[11px] font-bold text-slate-800">Owner preview</span><span className="block text-[9px] text-slate-400">View login screen</span></span>
                <ChevronDown size={14} className="hidden text-slate-400 sm:block" />
              </button>
            </div>
          </header>

          <main className="app-scrollbar flex-1 overflow-y-auto px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
            <div className="mx-auto max-w-[1480px]">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <StatusPill online={online} />
                <div className="flex items-center gap-2 text-[11px] text-slate-400"><Command size={13} /> Foundation preview · No live data connected</div>
              </div>
              {activePage === 'dashboard' ? (
                <Dashboard />
              ) : activePage === 'inventory' ? (
                <InventoryPage />
              ) : (
                <ModulePlaceholder
                  title={selectedItem.label}
                  titleMy={selectedItem.labelMy}
                  description={descriptions[activePage]}
                  icon={selectedItem.icon}
                />
              )}
            </div>
          </main>

          <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur lg:hidden">
            {mobileNavigation.map((page) => {
              const item = navigation.find((entry) => entry.key === page)!
              const Icon = item.icon
              const active = activePage === page
              return (
                <button key={page} onClick={() => selectPage(page)} className={`flex flex-col items-center gap-1 rounded-xl py-1.5 ${active ? 'text-blue-700' : 'text-slate-400'}`}>
                  <Icon size={19} strokeWidth={active ? 2.5 : 1.8} />
                  <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {updateAvailable && (
        <div className="fixed bottom-20 right-4 z-[60] max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl lg:bottom-5">
          <p className="text-sm font-bold text-slate-900">App update available</p>
          <p className="mt-1 text-xs text-slate-500">Refresh to install the latest interface version.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setUpdateAvailable(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Later</button>
            <button onClick={() => applyUpdate?.()} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Update now</button>
          </div>
        </div>
      )}
    </div>
  )
}
