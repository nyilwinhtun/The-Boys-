import Dexie, { type EntityTable } from 'dexie'
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
} from './types'

export const LOCAL_DATABASE_NAME = 'the-boys-mobile-local'
export const LOCAL_DATABASE_VERSION = 1

class TheBoysLocalDatabase extends Dexie {
  products!: EntityTable<ProductRecord, 'id'>
  variants!: EntityTable<ProductVariantRecord, 'id'>
  branches!: EntityTable<BranchRecord, 'id'>
  warehouses!: EntityTable<WarehouseRecord, 'id'>
  imeiUnits!: EntityTable<ImeiUnitRecord, 'imei'>
  imeiRegistry!: EntityTable<ImeiRegistryRecord, 'imei'>
  stockLedger!: EntityTable<StockLedgerRecord, 'id'>
  auditLogs!: EntityTable<AuditLogRecord, 'id'>
  syncOutbox!: EntityTable<SyncOutboxRecord, 'id'>
  appMeta!: EntityTable<AppMetaRecord, 'key'>

  constructor() {
    super(LOCAL_DATABASE_NAME)

    // Version 1 is the first released local schema. Never edit a released version;
    // add version(2), version(3), etc. and migrations for future schema changes.
    this.version(LOCAL_DATABASE_VERSION).stores({
      products: 'id, &sku, name, category, trackingMode, status, updatedAt',
      variants: 'id, productId, &sku, barcode, costingMethod, status, updatedAt, [productId+status]',
      branches: 'id, &code, type, status',
      warehouses: 'id, branchId, &code, status',
      imeiUnits: 'imei, variantId, status, warehouseId, branchId, updatedAt',
      imeiRegistry: 'imei, unitImei, role',
      stockLedger: 'id, &eventId, variantId, warehouseId, branchId, imei, sourceType, referenceId, occurredAt, recordedAt, [variantId+warehouseId], [imei+occurredAt]',
      auditLogs: 'id, entityType, entityId, action, actorId, occurredAt, recordedAt, [entityType+entityId], [entityType+occurredAt]',
      syncOutbox: 'id, &idempotencyKey, status, entityType, entityId, operation, createdAt, nextAttemptAt',
      appMeta: 'key, updatedAt',
    })
  }
}

export const db = new TheBoysLocalDatabase()

export interface LocalDatabaseHealth {
  ok: boolean
  databaseName: string
  version: number
  tableCount: number
  productCount: number
  pendingSyncCount: number
  checkedAt: string
  message: string
}

/** Opens IndexedDB and verifies a real write/read round-trip without creating sample business data. */
export async function checkLocalDatabaseHealth(): Promise<LocalDatabaseHealth> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('This browser does not provide IndexedDB. Open the app in a supported browser.')
  }

  await db.open()

  const checkedAt = new Date().toISOString()
  const healthKey = 'system.lastLocalDatabaseCheck'
  const savedCheck = await db.transaction('rw', db.appMeta, async () => {
    await db.appMeta.put({ key: healthKey, value: checkedAt, updatedAt: checkedAt })
    return db.appMeta.get(healthKey)
  }) as AppMetaRecord | undefined

  if (savedCheck?.value !== checkedAt) {
    throw new Error('Local database write/read verification failed.')
  }

  const [productCount, pendingSyncCount] = await Promise.all([
    db.products.count(),
    db.syncOutbox.where('status').equals('PENDING').count(),
  ])

  return {
    ok: true,
    databaseName: db.name,
    version: db.verno,
    tableCount: db.tables.length,
    productCount,
    pendingSyncCount,
    checkedAt,
    message: 'IndexedDB opened and write/read verification passed.',
  }
}
