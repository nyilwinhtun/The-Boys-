import { db } from '../../data/local'
import type {
  AuditLogRecord,
  CostingMethod,
  ProductRecord,
  ProductVariantRecord,
  RecordStatus,
  TrackingMode,
  SyncEntityType,
  SyncOperation,
  SyncOutboxRecord,
} from '../../data/local'

/** Temporary local actor until Firebase Authentication is connected in a later phase. */
export const LOCAL_SETUP_ACTOR_ID = 'LOCAL_OWNER_SETUP'
const LOCAL_DEVICE_ID = 'LOCAL_DEVICE_UNREGISTERED'

export interface VariantDraft {
  sku: string
  barcode?: string
  model?: string
  color?: string
  storage?: string
  costingMethod: CostingMethod
  retailPrice: number
  wholesalePrice?: number
}

export interface ProductDraft {
  sku: string
  name: string
  category: string
  brand?: string
  description?: string
  trackingMode: TrackingMode
  variant?: VariantDraft
}

export interface ProductUpdateDraft {
  id: string
  sku: string
  name: string
  category: string
  brand?: string
  description?: string
}

function makeId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  return uuid ? `${prefix}_${uuid}` : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
}

function cleanText(value: string | undefined): string | undefined {
  const result = value?.trim()
  return result ? result : undefined
}

function normalizeSku(value: string): string {
  return value.trim().toUpperCase()
}

function validateProduct(input: ProductDraft): void {
  if (!input.name.trim()) throw new Error('Product name is required.')
  if (!input.category.trim()) throw new Error('Category is required.')
  if (!normalizeSku(input.sku)) throw new Error('Product SKU is required.')
  if (input.variant) {
    if (!normalizeSku(input.variant.sku)) throw new Error('Variant SKU is required.')
    if (!Number.isFinite(input.variant.retailPrice) || input.variant.retailPrice < 0) {
      throw new Error('Retail price must be zero or greater.')
    }
    if (input.variant.wholesalePrice !== undefined && (!Number.isFinite(input.variant.wholesalePrice) || input.variant.wholesalePrice < 0)) {
      throw new Error('Wholesale price must be zero or greater.')
    }
  }
}

function makeAudit(
  entityType: string,
  entityId: string,
  action: AuditLogRecord['action'],
  actorId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
  reason?: string,
): AuditLogRecord {
  const now = new Date().toISOString()
  return {
    id: makeId('audit'),
    entityType,
    entityId,
    action,
    actorId,
    deviceId: LOCAL_DEVICE_ID,
    occurredAt: now,
    recordedAt: now,
    ...(before ? { before } : {}),
    ...(after ? { after } : {}),
    ...(reason ? { reason } : {}),
  }
}

function makeOutbox(
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperation,
  payload: Record<string, unknown>,
): SyncOutboxRecord {
  const now = new Date().toISOString()
  const id = makeId('sync')
  return {
    id,
    idempotencyKey: `catalogue:${entityType}:${entityId}:${operation}:${id}`,
    entityType,
    entityId,
    operation,
    payload,
    status: 'PENDING',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  }
}

export async function createProduct(input: ProductDraft, actorId = LOCAL_SETUP_ACTOR_ID): Promise<ProductRecord> {
  validateProduct(input)
  if (!input.variant) throw new Error('At least one variant is required for a new product.')

  const now = new Date().toISOString()
  const product: ProductRecord = {
    id: makeId('product'),
    sku: normalizeSku(input.sku),
    name: input.name.trim(),
    category: input.category.trim(),
    ...(cleanText(input.brand) ? { brand: cleanText(input.brand) } : {}),
    ...(cleanText(input.description) ? { description: cleanText(input.description) } : {}),
    trackingMode: input.trackingMode,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    createdBy: actorId,
    updatedBy: actorId,
  }

  const variantInput = input.variant
  const variant: ProductVariantRecord = {
    id: makeId('variant'),
    productId: product.id,
    sku: normalizeSku(variantInput.sku),
    ...(cleanText(variantInput.barcode) ? { barcode: cleanText(variantInput.barcode) } : {}),
    ...(cleanText(variantInput.model) ? { model: cleanText(variantInput.model) } : {}),
    ...(cleanText(variantInput.color) ? { color: cleanText(variantInput.color) } : {}),
    ...(cleanText(variantInput.storage) ? { storage: cleanText(variantInput.storage) } : {}),
    costingMethod: variantInput.costingMethod,
    retailPrice: variantInput.retailPrice,
    ...(variantInput.wholesalePrice !== undefined ? { wholesalePrice: variantInput.wholesalePrice } : {}),
    currency: 'MMK',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    createdBy: actorId,
    updatedBy: actorId,
  }

  const productAudit = makeAudit('PRODUCT', product.id, 'CREATE', actorId, undefined, { ...product })
  const variantAudit = makeAudit('PRODUCT_VARIANT', variant.id, 'CREATE', actorId, undefined, { ...variant })
  const productOutbox = makeOutbox('PRODUCT', product.id, 'CREATE', { product })
  const variantOutbox = makeOutbox('VARIANT', variant.id, 'CREATE', { variant })

  await db.transaction('rw', db.products, db.variants, db.auditLogs, db.syncOutbox, async () => {
    const [existingProduct, existingVariant] = await Promise.all([
      db.products.where('sku').equals(product.sku).first(),
      db.variants.where('sku').equals(variant.sku).first(),
    ])
    if (existingProduct) throw new Error(`Product SKU ${product.sku} already exists.`)
    if (existingVariant) throw new Error(`Variant SKU ${variant.sku} already exists.`)

    await db.products.add(product)
    await db.variants.add(variant)
    await db.auditLogs.bulkAdd([productAudit, variantAudit])
    await db.syncOutbox.bulkAdd([productOutbox, variantOutbox])
  })

  return product
}

export async function updateProduct(input: ProductUpdateDraft, actorId = LOCAL_SETUP_ACTOR_ID): Promise<ProductRecord> {
  if (!input.name.trim() || !input.category.trim() || !normalizeSku(input.sku)) {
    throw new Error('Product name, SKU and category are required.')
  }

  return db.transaction('rw', db.products, db.auditLogs, db.syncOutbox, async () => {
    const current = await db.products.get(input.id)
    if (!current) throw new Error('Product was not found.')
    if (current.status !== 'ACTIVE') throw new Error('Archived products cannot be edited. Restore them in a later management phase.')

    const sku = normalizeSku(input.sku)
    const duplicate = await db.products.where('sku').equals(sku).first()
    if (duplicate && duplicate.id !== current.id) throw new Error(`Product SKU ${sku} already exists.`)

    const now = new Date().toISOString()
    const updated: ProductRecord = {
      ...current,
      sku,
      name: input.name.trim(),
      category: input.category.trim(),
      brand: cleanText(input.brand),
      description: cleanText(input.description),
      updatedAt: now,
      updatedBy: actorId,
    }
    await db.products.put(updated)
    await db.auditLogs.add(makeAudit('PRODUCT', current.id, 'UPDATE', actorId, { ...current }, { ...updated }))
    await db.syncOutbox.add(makeOutbox('PRODUCT', current.id, 'UPDATE', { product: updated }))
    return updated
  })
}

export async function createVariant(productId: string, input: VariantDraft, actorId = LOCAL_SETUP_ACTOR_ID): Promise<ProductVariantRecord> {
  if (!normalizeSku(input.sku)) throw new Error('Variant SKU is required.')
  if (!Number.isFinite(input.retailPrice) || input.retailPrice < 0) throw new Error('Retail price must be zero or greater.')
  if (input.wholesalePrice !== undefined && (!Number.isFinite(input.wholesalePrice) || input.wholesalePrice < 0)) {
    throw new Error('Wholesale price must be zero or greater.')
  }

  return db.transaction('rw', db.products, db.variants, db.auditLogs, db.syncOutbox, async () => {
    const product = await db.products.get(productId)
    if (!product || product.status !== 'ACTIVE') throw new Error('An active product is required before adding a variant.')

    const sku = normalizeSku(input.sku)
    if (await db.variants.where('sku').equals(sku).first()) throw new Error(`Variant SKU ${sku} already exists.`)

    const now = new Date().toISOString()
    const variant: ProductVariantRecord = {
      id: makeId('variant'),
      productId,
      sku,
      ...(cleanText(input.barcode) ? { barcode: cleanText(input.barcode) } : {}),
      ...(cleanText(input.model) ? { model: cleanText(input.model) } : {}),
      ...(cleanText(input.color) ? { color: cleanText(input.color) } : {}),
      ...(cleanText(input.storage) ? { storage: cleanText(input.storage) } : {}),
      costingMethod: input.costingMethod,
      retailPrice: input.retailPrice,
      ...(input.wholesalePrice !== undefined ? { wholesalePrice: input.wholesalePrice } : {}),
      currency: 'MMK',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: actorId,
      updatedBy: actorId,
    }

    await db.variants.add(variant)
    await db.auditLogs.add(makeAudit('PRODUCT_VARIANT', variant.id, 'CREATE', actorId, undefined, { ...variant }))
    await db.syncOutbox.add(makeOutbox('VARIANT', variant.id, 'CREATE', { variant }))
    return variant
  })
}

export async function updateVariant(
  variantId: string,
  input: VariantDraft,
  actorId = LOCAL_SETUP_ACTOR_ID,
): Promise<ProductVariantRecord> {
  if (!normalizeSku(input.sku)) throw new Error('Variant SKU is required.')
  if (!Number.isFinite(input.retailPrice) || input.retailPrice < 0) throw new Error('Retail price must be zero or greater.')
  if (input.wholesalePrice !== undefined && (!Number.isFinite(input.wholesalePrice) || input.wholesalePrice < 0)) {
    throw new Error('Wholesale price must be zero or greater.')
  }

  return db.transaction('rw', db.variants, db.auditLogs, db.syncOutbox, async () => {
    const current = await db.variants.get(variantId)
    if (!current) throw new Error('Variant was not found.')
    if (current.status !== 'ACTIVE') throw new Error('Archived variants cannot be edited.')

    const sku = normalizeSku(input.sku)
    const duplicate = await db.variants.where('sku').equals(sku).first()
    if (duplicate && duplicate.id !== current.id) throw new Error(`Variant SKU ${sku} already exists.`)

    const now = new Date().toISOString()
    const updated: ProductVariantRecord = {
      ...current,
      sku,
      barcode: cleanText(input.barcode),
      model: cleanText(input.model),
      color: cleanText(input.color),
      storage: cleanText(input.storage),
      costingMethod: input.costingMethod,
      retailPrice: input.retailPrice,
      wholesalePrice: input.wholesalePrice,
      updatedAt: now,
      updatedBy: actorId,
    }
    await db.variants.put(updated)
    await db.auditLogs.add(makeAudit('PRODUCT_VARIANT', current.id, 'UPDATE', actorId, { ...current }, { ...updated }))
    await db.syncOutbox.add(makeOutbox('VARIANT', current.id, 'UPDATE', { variant: updated }))
    return updated
  })
}

/** Archive is reversible in future management flows; master data is never hard-deleted. */
export async function archiveProduct(productId: string, actorId = LOCAL_SETUP_ACTOR_ID): Promise<void> {
  await db.transaction('rw', db.products, db.variants, db.auditLogs, db.syncOutbox, async () => {
    const product = await db.products.get(productId)
    if (!product) throw new Error('Product was not found.')
    if (product.status === 'ARCHIVED') return

    const now = new Date().toISOString()
    const archivedProduct: ProductRecord = { ...product, status: 'ARCHIVED' as RecordStatus, updatedAt: now, updatedBy: actorId }
    await db.products.put(archivedProduct)
    await db.auditLogs.add(makeAudit('PRODUCT', product.id, 'ARCHIVE', actorId, { ...product }, { ...archivedProduct }, 'Archived from local product catalogue'))
    await db.syncOutbox.add(makeOutbox('PRODUCT', product.id, 'ARCHIVE', { product: archivedProduct }))

    const variants = await db.variants.where('productId').equals(productId).toArray()
    for (const variant of variants) {
      if (variant.status === 'ARCHIVED') continue
      const archivedVariant: ProductVariantRecord = { ...variant, status: 'ARCHIVED', updatedAt: now, updatedBy: actorId }
      await db.variants.put(archivedVariant)
      await db.auditLogs.add(makeAudit('PRODUCT_VARIANT', variant.id, 'ARCHIVE', actorId, { ...variant }, { ...archivedVariant }, 'Parent product archived'))
      await db.syncOutbox.add(makeOutbox('VARIANT', variant.id, 'ARCHIVE', { variant: archivedVariant }))
    }
  })
}

/** Restores an archived product and its archived variants without changing stock. */
export async function restoreProduct(productId: string, actorId = LOCAL_SETUP_ACTOR_ID): Promise<void> {
  await db.transaction('rw', db.products, db.variants, db.auditLogs, db.syncOutbox, async () => {
    const product = await db.products.get(productId)
    if (!product) throw new Error('Product was not found.')
    if (product.status === 'ACTIVE') return

    const now = new Date().toISOString()
    const restoredProduct: ProductRecord = {
      ...product,
      status: 'ACTIVE',
      updatedAt: now,
      updatedBy: actorId,
    }

    await db.products.put(restoredProduct)
    await db.auditLogs.add(
      makeAudit(
        'PRODUCT',
        product.id,
        'RESTORE',
        actorId,
        { ...product },
        { ...restoredProduct },
        'Restored to the local product catalogue',
      ),
    )
    await db.syncOutbox.add(makeOutbox('PRODUCT', product.id, 'UPDATE', { product: restoredProduct }))

    const variants = await db.variants.where('productId').equals(productId).toArray()
    for (const variant of variants) {
      if (variant.status !== 'ARCHIVED') continue

      const restoredVariant: ProductVariantRecord = {
        ...variant,
        status: 'ACTIVE',
        updatedAt: now,
        updatedBy: actorId,
      }

      await db.variants.put(restoredVariant)
      await db.auditLogs.add(
        makeAudit(
          'PRODUCT_VARIANT',
          variant.id,
          'RESTORE',
          actorId,
          { ...variant },
          { ...restoredVariant },
          'Parent product restored',
        ),
      )
      await db.syncOutbox.add(makeOutbox('VARIANT', variant.id, 'UPDATE', { variant: restoredVariant }))
    }
  })
}

