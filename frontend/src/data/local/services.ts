import { db } from './db'
import type { AuditAction, AuditLogRecord, StockLedgerRecord, SyncOutboxRecord } from './types'

function createLocalId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.()
  if (randomId) return `${prefix}_${randomId}`
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
}

export interface AuditInput {
  entityType: string
  entityId: string
  action: AuditAction
  actorId: string
  deviceId: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  reason?: string
  occurredAt?: string
}

/** Audit records are append-only. No update or delete helper is intentionally provided. */
export async function appendAuditLog(input: AuditInput): Promise<string> {
  const recordedAt = new Date().toISOString()
  const row: AuditLogRecord = {
    id: createLocalId('audit'),
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    actorId: input.actorId,
    deviceId: input.deviceId,
    occurredAt: input.occurredAt ?? recordedAt,
    recordedAt,
    ...(input.before ? { before: input.before } : {}),
    ...(input.after ? { after: input.after } : {}),
    ...(input.reason ? { reason: input.reason } : {}),
  }
  const outbox: SyncOutboxRecord = {
    id: createLocalId('sync'),
    idempotencyKey: `audit-log:${row.id}`,
    entityType: 'AUDIT_LOG',
    entityId: row.id,
    operation: 'APPEND',
    payload: { audit: row },
    status: 'PENDING',
    attempts: 0,
    createdAt: recordedAt,
    updatedAt: recordedAt,
  }
  await db.transaction('rw', db.auditLogs, db.syncOutbox, async () => {
    await db.auditLogs.add(row)
    await db.syncOutbox.add(outbox)
  })
  return row.id
}

export interface StockLedgerInput extends Omit<StockLedgerRecord, 'id' | 'recordedAt'> {}

/**
 * Appends one immutable stock movement and its audit/outbox records atomically.
 * This does not directly edit stock balances; balances must be derived from the ledger.
 */
export async function appendStockLedgerEntry(input: StockLedgerInput): Promise<StockLedgerRecord> {
  if (!Number.isFinite(input.quantityDelta) || input.quantityDelta === 0) {
    throw new Error('quantityDelta must be a non-zero finite number.')
  }
  if (input.trackingMode === 'IMEI' && (!input.imei || Math.abs(input.quantityDelta) !== 1)) {
    throw new Error('An IMEI-tracked movement must include one IMEI and have a quantityDelta of +1 or -1.')
  }
  if (input.trackingMode === 'QUANTITY' && input.imei) {
    throw new Error('Quantity-tracked stock must not include an IMEI.')
  }
  if (!input.eventId.trim()) throw new Error('eventId is required for idempotent stock recording.')

  const recordedAt = new Date().toISOString()
  const entry: StockLedgerRecord = {
    ...input,
    id: createLocalId('stock'),
    recordedAt,
  }
  const audit: AuditLogRecord = {
    id: createLocalId('audit'),
    entityType: 'STOCK_LEDGER',
    entityId: entry.id,
    action: 'APPEND',
    actorId: input.actorId,
    deviceId: input.deviceId,
    occurredAt: input.occurredAt,
    recordedAt,
    after: {
      eventId: entry.eventId,
      variantId: entry.variantId,
      warehouseId: entry.warehouseId,
      quantityDelta: entry.quantityDelta,
      sourceType: entry.sourceType,
      referenceId: entry.referenceId,
    },
  }
  const outbox: SyncOutboxRecord = {
    id: createLocalId('sync'),
    idempotencyKey: `stock-ledger:${input.eventId}`,
    entityType: 'STOCK_LEDGER',
    entityId: entry.id,
    operation: 'APPEND',
    payload: { entry, audit },
    status: 'PENDING',
    attempts: 0,
    createdAt: recordedAt,
    updatedAt: recordedAt,
  }

  return db.transaction('rw', db.stockLedger, db.auditLogs, db.syncOutbox, async () => {
    const existing = await db.stockLedger.where('eventId').equals(input.eventId).first()
    if (existing) {
      const sameMovement = existing.variantId === input.variantId
        && existing.warehouseId === input.warehouseId
        && existing.quantityDelta === input.quantityDelta
        && existing.sourceType === input.sourceType
        && existing.referenceId === input.referenceId
        && existing.imei === input.imei
      if (!sameMovement) {
        throw new Error('eventId has already been used for a different stock movement.')
      }
      return existing
    }

    await db.stockLedger.add(entry)
    await db.auditLogs.add(audit)
    await db.syncOutbox.add(outbox)
    return entry
  })
}
