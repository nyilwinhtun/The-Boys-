import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Archive, CheckCircle2, ChevronDown, ChevronRight, CircleAlert,
  ClipboardList, Edit3, Package, Plus, Search, Smartphone, Tag, X,
} from 'lucide-react'
import { db } from '../../data/local'
import type { CostingMethod, ProductRecord, ProductVariantRecord, TrackingMode } from '../../data/local'
import {
  archiveProduct, createProduct, createVariant, LOCAL_SETUP_ACTOR_ID,
  updateProduct, updateVariant, type ProductDraft, type ProductUpdateDraft, type VariantDraft,
} from './catalogueService'

type ProductDialog = { kind: 'product'; product?: ProductRecord } | null
type VariantDialog = { kind: 'variant'; product: ProductRecord; variant?: ProductVariantRecord } | null
type DialogState = ProductDialog | VariantDialog

const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
const labelClass = 'block text-xs font-semibold text-slate-600'
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60'
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60'

function getVariantTitle(variant: ProductVariantRecord): string {
  return [variant.model, variant.color, variant.storage].filter(Boolean).join(' · ') || 'Default variant'
}

function formatMMK(value: number): string {
  return `${value.toLocaleString('en-US')} MMK`
}

function ModalFrame({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-label={title} className="app-scrollbar max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><h2 className="text-lg font-bold text-slate-900">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p></div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>
        {children}
      </section>
    </div>
  )
}

function ProductForm({ product, onClose, onSave }: { product?: ProductRecord; onClose: () => void; onSave: (input: ProductDraft | ProductUpdateDraft) => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const text = (key: string) => String(form.get(key) ?? '').trim()
    try {
      if (product) {
        await onSave({ id: product.id, sku: text('sku'), name: text('name'), category: text('category'), brand: text('brand'), description: text('description') })
      } else {
        const wholesale = text('wholesalePrice')
        await onSave({
          sku: text('sku'), name: text('name'), category: text('category'), brand: text('brand'), description: text('description'),
          trackingMode: text('trackingMode') as TrackingMode,
          variant: {
            sku: text('variantSku'), barcode: text('barcode'), model: text('model'), color: text('color'), storage: text('storage'),
            costingMethod: text('costingMethod') as CostingMethod,
            retailPrice: Number(text('retailPrice')),
            ...(wholesale ? { wholesalePrice: Number(wholesale) } : {}),
          },
        })
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalFrame title={product ? 'Edit product details' : 'Add new product'} subtitle={product ? 'Update product information. Existing stock and sales history are not changed.' : 'Create the product and its first variant. This is saved to this device only.'} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>Product name *<input className={inputClass} name="name" required defaultValue={product?.name} placeholder="e.g. iPhone 16 Pro" /></label>
          <label className={labelClass}>Product SKU *<input className={inputClass} name="sku" required defaultValue={product?.sku} placeholder="e.g. IP16P" /></label>
          <label className={labelClass}>Category *<input className={inputClass} name="category" required defaultValue={product?.category} placeholder="e.g. Smartphone" /></label>
          <label className={labelClass}>Brand<input className={inputClass} name="brand" defaultValue={product?.brand ?? ''} placeholder="e.g. Apple" /></label>
        </div>
        <label className={labelClass}>Description <textarea className={`${inputClass} min-h-20 resize-y`} name="description" defaultValue={product?.description ?? ''} placeholder="Optional product notes" /></label>

        {!product && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-950"><Package size={17} /> First product variant</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>Tracking mode *<select className={inputClass} name="trackingMode" defaultValue="IMEI"><option value="IMEI">IMEI — each phone separately</option><option value="QUANTITY">Quantity — accessories / bulk items</option></select></label>
              <label className={labelClass}>Variant SKU *<input className={inputClass} name="variantSku" required placeholder="e.g. IP16P-256-BLK" /></label>
              <label className={labelClass}>Model<input className={inputClass} name="model" placeholder="e.g. 16 Pro" /></label>
              <label className={labelClass}>Color<input className={inputClass} name="color" placeholder="e.g. Black Titanium" /></label>
              <label className={labelClass}>Storage / size<input className={inputClass} name="storage" placeholder="e.g. 256GB / 1L / Pack of 10" /></label>
              <label className={labelClass}>Barcode<input className={inputClass} name="barcode" placeholder="Optional barcode" /></label>
              <label className={labelClass}>Costing method *<select className={inputClass} name="costingMethod" defaultValue="FIFO"><option value="FIFO">FIFO</option><option value="WEIGHTED_AVERAGE">Weighted Average</option></select></label>
              <label className={labelClass}>Retail price (MMK) *<input className={inputClass} name="retailPrice" type="number" min="0" step="1" required defaultValue="0" /></label>
              <label className={labelClass}>Wholesale price (MMK)<input className={inputClass} name="wholesalePrice" type="number" min="0" step="1" placeholder="Optional" /></label>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-blue-800">Stock quantity is not increased when a product is created. Stock will be added later through an approved Goods Receipt or opening-stock workflow.</p>
          </div>
        )}

        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700"><CircleAlert size={16} className="mt-0.5 shrink-0" />{error}</div>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className={secondaryButton} onClick={onClose}>Cancel</button><button type="submit" className={primaryButton} disabled={saving}>{saving ? 'Saving…' : product ? 'Save changes' : 'Create product'}</button></div>
      </form>
    </ModalFrame>
  )
}

function VariantForm({ product, variant, onClose, onSave }: { product: ProductRecord; variant?: ProductVariantRecord; onClose: () => void; onSave: (input: VariantDraft) => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const text = (key: string) => String(form.get(key) ?? '').trim()
    const wholesale = text('wholesalePrice')
    try {
      await onSave({
        sku: text('sku'), barcode: text('barcode'), model: text('model'), color: text('color'), storage: text('storage'),
        costingMethod: text('costingMethod') as CostingMethod,
        retailPrice: Number(text('retailPrice')),
        ...(wholesale ? { wholesalePrice: Number(wholesale) } : {}),
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this variant.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalFrame title={variant ? 'Edit variant' : 'Add product variant'} subtitle={`${product.name} · ${product.sku}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>Variant SKU *<input className={inputClass} name="sku" required defaultValue={variant?.sku} placeholder="Unique variant SKU" /></label>
          <label className={labelClass}>Barcode<input className={inputClass} name="barcode" defaultValue={variant?.barcode ?? ''} placeholder="Optional barcode" /></label>
          <label className={labelClass}>Model<input className={inputClass} name="model" defaultValue={variant?.model ?? ''} /></label>
          <label className={labelClass}>Color<input className={inputClass} name="color" defaultValue={variant?.color ?? ''} /></label>
          <label className={labelClass}>Storage / size<input className={inputClass} name="storage" defaultValue={variant?.storage ?? ''} /></label>
          <label className={labelClass}>Costing method *<select className={inputClass} name="costingMethod" defaultValue={variant?.costingMethod ?? 'FIFO'}><option value="FIFO">FIFO</option><option value="WEIGHTED_AVERAGE">Weighted Average</option></select></label>
          <label className={labelClass}>Retail price (MMK) *<input className={inputClass} name="retailPrice" type="number" min="0" step="1" required defaultValue={variant?.retailPrice ?? 0} /></label>
          <label className={labelClass}>Wholesale price (MMK)<input className={inputClass} name="wholesalePrice" type="number" min="0" step="1" defaultValue={variant?.wholesalePrice ?? ''} placeholder="Optional" /></label>
        </div>
        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700"><CircleAlert size={16} className="mt-0.5 shrink-0" />{error}</div>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className={secondaryButton} onClick={onClose}>Cancel</button><button type="submit" className={primaryButton} disabled={saving}>{saving ? 'Saving…' : variant ? 'Save variant' : 'Add variant'}</button></div>
      </form>
    </ModalFrame>
  )
}

export function InventoryPage() {
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [variants, setVariants] = useState<ProductVariantRecord[]>([])
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function reload() {
    setLoading(true)
    setError('')
    try {
      const [allProducts, allVariants] = await Promise.all([db.products.toArray(), db.variants.toArray()])
      const visibleStatus = showArchived ? 'ARCHIVED' : 'ACTIVE'
      setProducts(allProducts.filter((product) => product.status === visibleStatus).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
      setVariants(allVariants.filter((variant) => variant.status === visibleStatus))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load local product records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [showArchived])

  const variantsByProduct = useMemo(() => {
    const map: Record<string, ProductVariantRecord[]> = {}
    for (const variant of variants) (map[variant.productId] ??= []).push(variant)
    return map
  }, [variants])

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return products
    return products.filter((product) => {
      const productText = [product.name, product.sku, product.brand, product.category].filter(Boolean).join(' ').toLowerCase()
      const variantText = (variantsByProduct[product.id] ?? []).map((variant) => [variant.sku, variant.barcode, variant.model, variant.color, variant.storage].filter(Boolean).join(' ')).join(' ').toLowerCase()
      return productText.includes(term) || variantText.includes(term)
    })
  }, [products, query, variantsByProduct])

  async function saveProduct(input: ProductDraft | ProductUpdateDraft) {
    if ('id' in input) {
      await updateProduct(input, LOCAL_SETUP_ACTOR_ID)
      setNotice('Product details updated and saved on this device.')
    } else {
      await createProduct(input, LOCAL_SETUP_ACTOR_ID)
      setNotice('Product and first variant created successfully on this device.')
    }
    setDialog(null)
    await reload()
  }

  async function saveVariant(productId: string, variantId: string | undefined, input: VariantDraft) {
    if (variantId) {
      await updateVariant(variantId, input, LOCAL_SETUP_ACTOR_ID)
      setNotice('Variant updated and saved on this device.')
    } else {
      await createVariant(productId, input, LOCAL_SETUP_ACTOR_ID)
      setNotice('New variant added and saved on this device.')
    }
    setDialog(null)
    await reload()
  }

  async function handleArchive(product: ProductRecord) {
    const confirmed = window.confirm(`Archive ${product.name} (${product.sku})? It will be hidden from the active catalogue. No record will be hard-deleted.`)
    if (!confirmed) return
    try {
      await archiveProduct(product.id, LOCAL_SETUP_ACTOR_ID)
      setNotice('Product and its variants archived. Records were retained.')
      await reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not archive this product.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Inventory management</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Product catalogue</h1>
          <p className="mt-1 text-sm text-slate-500">Manage product details, variants, SKU, barcode and costing method.</p>
        </div>
        <button type="button" className={primaryButton} onClick={() => setDialog({ kind: 'product' })} disabled={showArchived}><Plus size={16} /> Add product</button>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
        <div className="flex items-start gap-3"><Smartphone size={18} className="mt-0.5 shrink-0 text-blue-700" /><div><p className="text-sm font-bold text-blue-950">Local-first catalogue</p><p className="mt-1 text-xs leading-5 text-blue-800">Products are stored in this browser's IndexedDB. Changes are queued for a future secure cloud-sync phase. This device does not share its local records with other devices yet.</p></div></div>
      </div>

      {(notice || error) && <div role="status" className={`flex items-start gap-2 rounded-xl border p-3 text-xs leading-5 ${error ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}><CheckCircle2 size={16} className="mt-0.5 shrink-0" /><div className="flex-1">{error || notice}</div><button type="button" aria-label="Dismiss message" onClick={() => { setNotice(''); setError('') }}><X size={14} /></button></div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-bold text-slate-900">Products</h2><p className="mt-1 text-xs text-slate-500">{products.length} {showArchived ? 'archived' : 'active'} products · {variants.length} variants</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" className={secondaryButton} onClick={() => setShowArchived((value) => !value)}><Archive size={14} /> {showArchived ? 'Show active' : 'Show archived'}</button><button type="button" className={secondaryButton} onClick={() => void reload()}><ClipboardList size={14} /> Refresh</button></div>
        </div>
        <div className="relative mt-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className={`${inputClass} mt-0 pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, SKU, brand, barcode, model…" /></div>

        {loading ? <div className="py-12 text-center text-sm text-slate-500">Loading local products…</div> : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Package size={22} /></span><p className="mt-3 text-sm font-bold text-slate-800">{query ? 'No matching products' : showArchived ? 'No archived products' : 'No products yet'}</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">{query ? 'Try another product name, SKU or barcode.' : showArchived ? 'Archived products will appear here.' : 'Add the first product to begin building your catalogue. No stock quantity will be added at this stage.'}</p>{!showArchived && !query && <button type="button" className={`${primaryButton} mt-4`} onClick={() => setDialog({ kind: 'product' })}><Plus size={15} /> Add first product</button>}</div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredProducts.map((product) => {
              const productVariants = variantsByProduct[product.id] ?? []
              const expanded = expandedProduct === product.id
              return (
                <article key={product.id} className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <button type="button" onClick={() => setExpandedProduct(expanded ? null : product.id)} aria-label={expanded ? 'Collapse variants' : 'Expand variants'} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Package size={18} /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{product.name}</span><span className="mt-1 block truncate text-[11px] text-slate-500">{product.sku} · {product.brand || 'No brand'} · {product.category}</span></span>
                      {expanded ? <ChevronDown size={17} className="shrink-0 text-slate-400" /> : <ChevronRight size={17} className="shrink-0 text-slate-400" />}
                    </button>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${product.trackingMode === 'IMEI' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>{product.trackingMode === 'IMEI' ? 'IMEI tracked' : 'Quantity tracked'}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{productVariants.length} variants</span>
                      {!showArchived && <><button type="button" className={secondaryButton} onClick={() => setDialog({ kind: 'product', product })}><Edit3 size={13} /> Edit</button><button type="button" className={`${secondaryButton} text-rose-600 hover:bg-rose-50`} onClick={() => void handleArchive(product)}><Archive size={13} /> Archive</button></>}
                    </div>
                  </div>
                  {expanded && <div className="border-t border-slate-100 bg-slate-50/70 p-3 sm:p-4"><div className="mb-3 flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-700">Product variants</p>{!showArchived && <button type="button" className={secondaryButton} onClick={() => setDialog({ kind: 'variant', product })}><Plus size={13} /> Add variant</button>}</div>
                    {productVariants.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">No variants in this view.</p> : <div className="space-y-2">{productVariants.map((variant) => <div key={variant.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-xs font-bold text-slate-800">{getVariantTitle(variant)}</p><p className="mt-1 break-all text-[10px] text-slate-500">SKU: {variant.sku}{variant.barcode ? ` · Barcode: ${variant.barcode}` : ''}</p><p className="mt-1 text-[10px] text-slate-500">Retail {formatMMK(variant.retailPrice)} · {variant.costingMethod === 'FIFO' ? 'FIFO' : 'Weighted Average'}</p></div>{!showArchived && <button type="button" className={secondaryButton} onClick={() => setDialog({ kind: 'variant', product, variant })}><Edit3 size={13} /> Edit variant</button>}</div>)}</div>}
                  </div>}
                </article>
              )
            })}
          </div>
        )}
      </section>

      <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><Tag size={15} className="mt-0.5 shrink-0" /><p>Product creation does not increase stock. IMEI registration, quantity balances, goods receipts, supplier costs and stock valuation will be introduced in their dedicated phases.</p></div>

      {dialog?.kind === 'product' && <ProductForm product={dialog.product} onClose={() => setDialog(null)} onSave={saveProduct} />}
      {dialog?.kind === 'variant' && <VariantForm product={dialog.product} variant={dialog.variant} onClose={() => setDialog(null)} onSave={(input) => saveVariant(dialog.product.id, dialog.variant?.id, input)} />}
    </div>
  )
}
