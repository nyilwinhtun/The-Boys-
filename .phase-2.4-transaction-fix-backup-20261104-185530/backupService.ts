import { db, LOCAL_DATABASE_VERSION } from '../../data/local'
import type {
  AppMetaRecord,
  AuditLogRecord,
  BranchRecord,
  ImeiRegistryRecord,
  ImeiUnitRecord,
  ProductRecord,
  ProductVariantRecord,
  StockLedgerRecord,
  SyncOutboxRecord,
  WarehouseRecord,
} from '../../data/local'

export const LOCAL_BACKUP_FORMAT = 'THE_BOYS_MOBILE_LOCAL_BACKUP'
export const LOCAL_BACKUP_VERSION = 1

export interface LocalBackupData {
  products: ProductRecord[]
  variants: ProductVariantRecord[]
  branches: BranchRecord[]
  warehouses: WarehouseRecord[]
  imeiUnits: ImeiUnitRecord[]
  imeiRegistry: ImeiRegistryRecord[]
  stockLedger: StockLedgerRecord[]
  auditLogs: AuditLogRecord[]
  syncOutbox: SyncOutboxRecord[]
  appMeta: AppMetaRecord[]
}

export interface LocalBackupSnapshot {
  format: typeof LOCAL_BACKUP_FORMAT
  backupVersion: number
  appName: string
  schemaVersion: number
  exportedAt: string
  data: LocalBackupData
}

export interface LocalRecordCounts {
  products: number
  variants: number
  branches: number
  warehouses: number
  imeiUnits: number
  imeiRegistry: number
  stockLedger: number
  auditLogs: number
  syncOutbox: number
  appMeta: number
}

export async function createLocalBackup(): Promise<LocalBackupSnapshot> {
  await db.open()
  const [
    products, variants, branches, warehouses, imeiUnits,
    imeiRegistry, stockLedger, auditLogs, syncOutbox, appMeta,
  ] = await Promise.all([
    db.products.toArray(),
    db.variants.toArray(),
    db.branches.toArray(),
    db.warehouses.toArray(),
    db.imeiUnits.toArray(),
    db.imeiRegistry.toArray(),
    db.stockLedger.toArray(),
    db.auditLogs.toArray(),
    db.syncOutbox.toArray(),
    db.appMeta.toArray(),
  ])

  return {
    format: LOCAL_BACKUP_FORMAT,
    backupVersion: LOCAL_BACKUP_VERSION,
    appName: 'The Boys Mobile',
    schemaVersion: db.verno,
    exportedAt: new Date().toISOString(),
    data: {
      products, variants, branches, warehouses, imeiUnits,
      imeiRegistry, stockLedger, auditLogs, syncOutbox, appMeta,
    },
  }
}

export async function getLocalRecordCounts(): Promise<LocalRecordCounts> {
  await db.open()
  const [
    products, variants, branches, warehouses, imeiUnits,
    imeiRegistry, stockLedger, auditLogs, syncOutbox, appMeta,
  ] = await Promise.all([
    db.products.count(),
    db.variants.count(),
    db.branches.count(),
    db.warehouses.count(),
    db.imeiUnits.count(),
    db.imeiRegistry.count(),
    db.stockLedger.count(),
    db.auditLogs.count(),
    db.syncOutbox.count(),
    db.appMeta.count(),
  ])
  return {
    products, variants, branches, warehouses, imeiUnits,
    imeiRegistry, stockLedger, auditLogs, syncOutbox, appMeta,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireUniqueStringKeys(rows: unknown[], field: string, tableName: string): void {
  const keys = new Set<string>()
  for (const row of rows) {
    if (!isRecord(row) || typeof row[field] !== 'string' || !row[field]) {
      throw new Error(`Backup validation failed: ${tableName}.${field} is missing or invalid.`)
    }
    const key = row[field] as string
    if (keys.has(key)) throw new Error(`Backup validation failed: duplicate ${tableName}.${field} "${key}".`)
    keys.add(key)
  }
}

function requireReferences(
  rows: Record<string, unknown>[],
  field: string,
  allowed: Set<string>,
  label: string,
  optional = false,
): void {
  for (const row of rows) {
    const value = row[field]
    if (optional && (value === undefined || value === null || value === '')) continue
    if (typeof value !== 'string' || !allowed.has(value)) {
      throw new Error(`Backup validation failed: ${label} references a missing record.`)
    }
  }
}

export function validateLocalBackup(value: unknown): LocalBackupSnapshot {
  if (!isRecord(value) || value.format !== LOCAL_BACKUP_FORMAT) {
    throw new Error('This is not a The Boys Mobile backup file.')
  }
  if (value.backupVersion !== LOCAL_BACKUP_VERSION) {
    throw new Error('This backup format version is not supported by this app.')
  }
  if (value.schemaVersion !== LOCAL_DATABASE_VERSION) {
    throw new Error(
      `Database version mismatch. Backup: ${String(value.schemaVersion)}, app: ${LOCAL_DATABASE_VERSION}.`,
    )
  }
  if (!isRecord(value.data)) throw new Error('Backup data section is missing.')

  const tableNames = [
    'products', 'variants', 'branches', 'warehouses', 'imeiUnits',
    'imeiRegistry', 'stockLedger', 'auditLogs', 'syncOutbox', 'appMeta',
  ] as const

  for (const tableName of tableNames) {
    if (!Array.isArray(value.data[tableName])) {
      throw new Error(`Backup is incomplete: ${tableName} table is missing.`)
    }
    if (!(value.data[tableName] as unknown[]).every(isRecord)) {
      throw new Error(`Backup contains invalid records in ${tableName}.`)
    }
  }

  const data = value.data as unknown as LocalBackupData
  requireUniqueStringKeys(data.products, 'id', 'products')
  requireUniqueStringKeys(data.products, 'sku', 'products')
  requireUniqueStringKeys(data.variants, 'id', 'variants')
  requireUniqueStringKeys(data.variants, 'sku', 'variants')
  requireUniqueStringKeys(data.branches, 'id', 'branches')
  requireUniqueStringKeys(data.branches, 'code', 'branches')
  requireUniqueStringKeys(data.warehouses, 'id', 'warehouses')
  requireUniqueStringKeys(data.warehouses, 'code', 'warehouses')
  requireUniqueStringKeys(data.imeiUnits, 'imei', 'imeiUnits')
  requireUniqueStringKeys(data.imeiRegistry, 'imei', 'imeiRegistry')
  requireUniqueStringKeys(data.stockLedger, 'id', 'stockLedger')
  requireUniqueStringKeys(data.stockLedger, 'eventId', 'stockLedger')
  requireUniqueStringKeys(data.auditLogs, 'id', 'auditLogs')
  requireUniqueStringKeys(data.syncOutbox, 'id', 'syncOutbox')
  requireUniqueStringKeys(data.syncOutbox, 'idempotencyKey', 'syncOutbox')
  requireUniqueStringKeys(data.appMeta, 'key', 'appMeta')

  const productIds = new Set(data.products.map((row) => row.id))
  const variantIds = new Set(data.variants.map((row) => row.id))
  const branchIds = new Set(data.branches.map((row) => row.id))
  const warehouseIds = new Set(data.warehouses.map((row) => row.id))
  const imeiIds = new Set(data.imeiUnits.map((row) => row.imei))

  requireReferences(data.variants as unknown as Record<string, unknown>[], 'productId', productIds, 'variants.productId')
  requireReferences(data.warehouses as unknown as Record<string, unknown>[], 'branchId', branchIds, 'warehouses.branchId')
  requireReferences(data.imeiUnits as unknown as Record<string, unknown>[], 'variantId', variantIds, 'imeiUnits.variantId')
  requireReferences(data.imeiUnits as unknown as Record<string, unknown>[], 'branchId', branchIds, 'imeiUnits.branchId', true)
  requireReferences(data.imeiUnits as unknown as Record<string, unknown>[], 'warehouseId', warehouseIds, 'imeiUnits.warehouseId', true)
  requireReferences(data.imeiRegistry as unknown as Record<string, unknown>[], 'unitImei', imeiIds, 'imeiRegistry.unitImei')
  requireReferences(data.stockLedger as unknown as Record<string, unknown>[], 'variantId', variantIds, 'stockLedger.variantId')
  requireReferences(data.stockLedger as unknown as Record<string, unknown>[], 'branchId', branchIds, 'stockLedger.branchId')
  requireReferences(data.stockLedger as unknown as Record<string, unknown>[], 'warehouseId', warehouseIds, 'stockLedger.warehouseId')

  return value as unknown as LocalBackupSnapshot
}

export function parseLocalBackupText(text: string): LocalBackupSnapshot {
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new Error('The selected file is not valid JSON.')
  }
  return validateLocalBackup(parsed)
}

/**
 * Replaces all local tables inside one IndexedDB transaction.
 * If any write fails, IndexedDB rolls the transaction back.
 */
export async function restoreLocalBackup(snapshot: LocalBackupSnapshot): Promise<void> {
  const validated = validateLocalBackup(snapshot)

  await db.transaction(
    'rw',
    db.products, db.variants, db.branches, db.warehouses, db.imeiUnits,
    db.imeiRegistry, db.stockLedger, db.auditLogs, db.syncOutbox, db.appMeta,
    async () => {
      await db.products.clear()
      await db.variants.clear()
      await db.branches.clear()
      await db.warehouses.clear()
      await db.imeiUnits.clear()
      await db.imeiRegistry.clear()
      await db.stockLedger.clear()
      await db.auditLogs.clear()
      await db.syncOutbox.clear()
      await db.appMeta.clear()

      const data = validated.data
      if (data.products.length) await db.products.bulkAdd(data.products)
      if (data.variants.length) await db.variants.bulkAdd(data.variants)
      if (data.branches.length) await db.branches.bulkAdd(data.branches)
      if (data.warehouses.length) await db.warehouses.bulkAdd(data.warehouses)
      if (data.imeiUnits.length) await db.imeiUnits.bulkAdd(data.imeiUnits)
      if (data.imeiRegistry.length) await db.imeiRegistry.bulkAdd(data.imeiRegistry)
      if (data.stockLedger.length) await db.stockLedger.bulkAdd(data.stockLedger)
      if (data.auditLogs.length) await db.auditLogs.bulkAdd(data.auditLogs)
      if (data.syncOutbox.length) await db.syncOutbox.bulkAdd(data.syncOutbox)
      if (data.appMeta.length) await db.appMeta.bulkAdd(data.appMeta)
    },
  )
}
