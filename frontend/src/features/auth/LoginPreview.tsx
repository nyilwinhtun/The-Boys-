import { ArrowLeft, LockKeyhole, Smartphone } from 'lucide-react'

interface LoginPreviewProps {
  onBack: () => void
}

export function LoginPreview({ onBack }: LoginPreviewProps) {
  return (
    <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-9">
        <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft size={16} /> Back to preview
        </button>
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-lg font-black tracking-tight text-white">TB</div>
          <div>
            <div className="text-sm font-extrabold tracking-wide text-slate-900">THE BOYS MOBILE</div>
            <div className="text-xs text-slate-500">Management System</div>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Sign in UI preview. Authentication will be connected in the security implementation phase.</p>
        <form className="mt-7 space-y-4" onSubmit={(event) => event.preventDefault()}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Email address</span>
            <input disabled type="email" placeholder="name@theboysmobile.com" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400 outline-none" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
            <input disabled type="password" placeholder="Enter your password" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400 outline-none" />
          </label>
          <button disabled className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-300 px-4 py-3 text-sm font-bold text-white">
            <LockKeyhole size={16} /> Authentication not connected
          </button>
        </form>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
          <Smartphone size={16} className="mt-0.5 shrink-0" />
          <p>This is a visual preview only. No credentials are collected or sent. Existing Firebase authentication is not modified.</p>
        </div>
      </div>
    </div>
  )
}
