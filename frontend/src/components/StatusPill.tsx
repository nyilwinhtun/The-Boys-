import { Circle, CloudOff, Wifi } from 'lucide-react'

interface StatusPillProps {
  online: boolean
  preview?: boolean
}

export function StatusPill({ online, preview = true }: StatusPillProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${online ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
        {online ? <Wifi size={13} /> : <CloudOff size={13} />}
        {online ? 'Online' : 'Offline'}
      </span>
      {preview && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          <Circle size={7} className="fill-slate-400 text-slate-400" />
          UI Preview
        </span>
      )}
    </div>
  )
}
