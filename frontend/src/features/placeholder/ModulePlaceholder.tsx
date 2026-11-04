import type { LucideIcon } from 'lucide-react'
import { Construction, ShieldCheck } from 'lucide-react'

interface ModulePlaceholderProps {
  title: string
  titleMy: string
  description: string
  icon: LucideIcon
}

export function ModulePlaceholder({ title, titleMy, description, icon: Icon }: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">The Boys Mobile / Module</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{titleMy}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <div className="mx-auto flex max-w-lg flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Icon size={28} /></div>
          <div className="mt-5 flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800"><Construction size={13} /> Module not implemented</div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">{title} workspace</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left text-xs leading-5 text-emerald-800">
            <ShieldCheck size={17} className="shrink-0" />
            This screen is a visual foundation only. No live inventory, customer, payment, or financial records are connected yet.
          </div>
        </div>
      </div>
    </div>
  )
}
