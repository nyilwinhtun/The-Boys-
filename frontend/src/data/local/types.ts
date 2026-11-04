export type IsoDateTime = string

export type RecordStatus = 'ACTIVE' | 'ARCHIVED'
export type TrackingMode = 'IMEI' | 'QUANTITY'
export type CostingMethod = 'FIFO' | 'WEIGHTED_AVERAGE'
export type BranchType = 'MAIN_WAREHOUSE' | 'BRANCH'
export type ImeiStatus = 'IN_STOCK' | 'RESERVED' | 'SOLD' | 'RETURNED' | 'IN_REPAIR' | 'DAMAGED'
export type StockSourceType =
  | 'OPENING_BALANCE'
  | 'GOODS_RECEIPT'
  | 'SALE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'CUSTOMER_RETURN'
  | 'TRADE_IN'
  | 'ADJUSTMENT'

export type SyncStatus =
  | 'PENDING'
  | 'SYNCING'
  | 'SYNCED'
  | 'FAILED'
  | 'CONFLICT'
  | 'NEEDS_REVIEW'

export type AuditAction = 'CREATE' | 'UPDATE' | 'ARCHIVE' | 'RESTORE' | 'APPROVE' | 'REJECT' | 'APPEND' | 'VOID'
export type SyncEntityType = 'PRODUCT' | 'VARIANT' | 'IMEI_UNIT' | 'STOCK_LEDGER' | 'AUDIT_LOG' | 'BRANCH' | 'WAREHOUSE'
export type SyncOperation = 'CREATE' | 'UPDATE' | 'ARCHIVE' | 'APPEND'

export interface ProductRecord {
  id: string
  sku: string
  name: string
  category: string
  brand?: string
  description?: string
  trackingMode: TrackingMode
  status: RecordStatus
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  createdBy: string
  updatedBy: string
}

export interface ProductVariantRecord {
  id: string
  productId: string
  sku: string
  barcode?: string
  model?: string
  color?: string
  storage?: string
  costingMethod: CostingMethod
  retailPrice: number
  wholesalePrice?: number
  currency: 'MMK'
  status: RecordStatus
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  createdBy: string
  updatedBy: string
}

export interface BranchRecord {
  id: string
  code: string
  name: string
  type: BranchType
  status: RecordStatus
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export interface WarehouseRecord {
  id: string
  branchId: string
  code: string
  name: string
  status: RecordStatus
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export interface ImeiUnitRecord {
  imei: string
  secondaryImei?: string
  variantId: string
  status: ImeiStatus
  warehouseId?: string
  branchId?: string
  acquisitionCost: number
  currency: 'MMK'
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

/** Registry rows make both primary and secondary IMEIs globally unique on this device. */
export interface ImeiRegistryRecord {
  imei: string
  unitImei: string
  role: 'PRIMARY' | 'SECONDARY'
  registeredAt: IsoDateTime
}

/** Append-only movement record. quantityDelta is positive for stock-in and negative for stock-out. */
export interface StockLedgerRecord {
  id: string
  eventId: string
  variantId: string
  warehouseId: string
  branchId: string
  trackingMode: TrackingMode
  quantityDelta: number
  imei?: string
  sourceType: StockSourceType
  referenceId: string
  occurredAt: IsoDateTime
  recordedAt: IsoDateTime
  actorId: string
  deviceId: string
  note?: string
}

export interface AuditLogRecord {
  id: string
  entityType: string
  entityId: string
  action: AuditAction
  actorId: string
  deviceId: string
  occurredAt: IsoDateTime
  recordedAt: IsoDateTime
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  reason?: string
}

export interface SyncOutboxRecord {
  id: string
  idempotencyKey: string
  entityType: SyncEntityType
  entityId: string
  operation: SyncOperation
  payload: Record<string, unknown>
  status: SyncStatus
  attempts: number
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  nextAttemptAt?: IsoDateTime
  lastError?: string
}

export interface AppMetaRecord {
  key: string
  value: string
  updatedAt: IsoDateTime
}
