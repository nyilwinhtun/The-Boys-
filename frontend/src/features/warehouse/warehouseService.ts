import { db } from '../../data/local'
import type {
  AuditLogRecord,
  BranchRecord,
  BranchType,
  SyncEntityType,
  SyncOperation,
  SyncOutboxRecord,
  WarehouseRecord,
} from '../../data/local'

export const LOCAL_LOCATION_ACTOR_ID = 'LOCAL_OWNER_SETUP'

export interface CreateLocationInput {
  type: BranchType
  code: string
  name: string
  warehouseCode: string
  warehouseName: string
}

export interface LocationWithWarehouses {
  branch: BranchRecord
  warehouses: WarehouseRecord[]
}

function createId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  return uuid ? `${prefix}_${uuid}` : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '-')
}

function makeAudit(entityType: string, entityId: string, after: Record<string, unknown>): AuditLogRecord {
  const now = new Date().toISOString()
  return {
    id: createId('audit'),
    entityType,
    entityId,
    action: 'CREATE',
    actorId: LOCAL_LOCATION_ACTOR_ID,
    deviceId: 'LOCAL_DEVICE_UNREGISTERED',
    occurredAt: now,
    recordedAt: now,
    after,
    reason: 'Created during local warehouse and branch setup',
  }
}

function makeOutbox(
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperation,
  payload: Record<string, unknown>,
): SyncOutboxRecord {
  const now = new Date().toISOString()
  const id = createId('sync')
  return {
    id,
    idempotencyKey: `location:${entityType}:${entityId}:${operation}:${id}`,
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

export async function listLocations(): Promise<LocationWithWarehouses[]> {
  const [branchRows, warehouses] = await Promise.all([
    db.branches.toArray(),
    db.warehouses.toArray(),
  ])
  const branches = branchRows.sort((a, b) => a.name.localeCompare(b.name))

  return branches.map((branch) => ({
    branch,
    warehouses: warehouses
      .filter((warehouse) => warehouse.branchId === branch.id)
      .sort((a, b) => a.code.localeCompare(b.code)),
  }))
}

/** Creates a location group and its first warehouse atomically; it does not add stock. */
export async function createLocation(input: CreateLocationInput): Promise<LocationWithWarehouses> {
  if (input.type !== 'MAIN_WAREHOUSE' && input.type !== 'BRANCH') {
    throw new Error('Choose a valid location type.')
  }

  const code = normalizeCode(input.code)
  const warehouseCode = normalizeCode(input.warehouseCode)
  const name = input.name.trim()
  const warehouseName = input.warehouseName.trim()

  if (!code || !name || !warehouseCode || !warehouseName) {
    throw new Error('Please complete all branch and warehouse fields.')
  }

  const now = new Date().toISOString()
  const branch: BranchRecord = {
    id: createId('location'),
    code,
    name,
    type: input.type,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  }
  const warehouse: WarehouseRecord = {
    id: createId('warehouse'),
    branchId: branch.id,
    code: warehouseCode,
    name: warehouseName,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  }

  const branchAudit = makeAudit('BRANCH', branch.id, { ...branch })
  const warehouseAudit = makeAudit('WAREHOUSE', warehouse.id, { ...warehouse })
  const branchOutbox = makeOutbox('BRANCH', branch.id, 'CREATE', { branch })
  const warehouseOutbox = makeOutbox('WAREHOUSE', warehouse.id, 'CREATE', { warehouse })

  await db.transaction('rw', db.branches, db.warehouses, db.auditLogs, db.syncOutbox, async () => {
    const [existingBranch, existingWarehouse] = await Promise.all([
      db.branches.where('code').equals(code).first(),
      db.warehouses.where('code').equals(warehouseCode).first(),
    ])
    if (existingBranch) throw new Error(`Location code ${code} already exists.`)
    if (existingWarehouse) throw new Error(`Warehouse code ${warehouseCode} already exists.`)

    if (input.type === 'MAIN_WAREHOUSE') {
      const existingMain = await db.branches.where('type').equals('MAIN_WAREHOUSE').first()
      if (existingMain) throw new Error('A Main Warehouse is already configured. Do not create a second Main Warehouse.')
    }

    await db.branches.add(branch)
    await db.warehouses.add(warehouse)
    await db.auditLogs.bulkAdd([branchAudit, warehouseAudit])
    await db.syncOutbox.bulkAdd([branchOutbox, warehouseOutbox])
  })

  return { branch, warehouses: [warehouse] }
}
