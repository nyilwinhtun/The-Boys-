import { db } from '../../data/local'
import type {
  AuditAction,
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


export interface UpdateLocationInput {
  id: string
  code: string
  name: string
}

export interface UpdateWarehouseInput {
  id: string
  code: string
  name: string
}

function makeMutationAudit(
  entityType: string,
  entityId: string,
  action: AuditAction,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  reason: string,
): AuditLogRecord {
  const now = new Date().toISOString()
  return {
    id: createId('audit'),
    entityType,
    entityId,
    action,
    actorId: LOCAL_LOCATION_ACTOR_ID,
    deviceId: 'LOCAL_DEVICE_UNREGISTERED',
    occurredAt: now,
    recordedAt: now,
    before,
    after,
    reason,
  }
}

/** Edits a location without replacing its ID or removing historical stock references. */
export async function updateLocation(input: UpdateLocationInput): Promise<void> {
  const code = normalizeCode(input.code)
  const name = input.name.trim()
  if (!code || !name) throw new Error('Branch code and name are required.')

  await db.transaction('rw', db.branches, db.auditLogs, db.syncOutbox, async () => {
    const before = await db.branches.get(input.id)
    if (!before) throw new Error('Branch was not found.')
    const duplicate = await db.branches.where('code').equals(code).first()
    if (duplicate && duplicate.id !== input.id) throw new Error(`Branch code ${code} is already in use.`)

    const after: BranchRecord = {
      ...before,
      code,
      name,
      type: 'BRANCH',
      updatedAt: new Date().toISOString(),
    }
    if (before.code === after.code && before.name === after.name && before.type === 'BRANCH') return

    await db.branches.put(after)
    await db.auditLogs.add(makeMutationAudit(
      'BRANCH', before.id, 'UPDATE', { ...before }, { ...after },
      'Updated branch details; legacy main-warehouse type is normalized to shop branch',
    ))
    await db.syncOutbox.add(makeOutbox('BRANCH', after.id, 'UPDATE', { branch: after }))
  })
}

/** Edits a warehouse code/name while keeping its branch relationship and ID unchanged. */
export async function updateWarehouse(input: UpdateWarehouseInput): Promise<void> {
  const code = normalizeCode(input.code)
  const name = input.name.trim()
  if (!code || !name) throw new Error('Warehouse code and name are required.')

  await db.transaction('rw', db.warehouses, db.auditLogs, db.syncOutbox, async () => {
    const before = await db.warehouses.get(input.id)
    if (!before) throw new Error('Warehouse was not found.')
    const duplicate = await db.warehouses.where('code').equals(code).first()
    if (duplicate && duplicate.id !== input.id) throw new Error(`Warehouse code ${code} is already in use.`)

    const after: WarehouseRecord = {
      ...before,
      code,
      name,
      updatedAt: new Date().toISOString(),
    }
    if (before.code === after.code && before.name === after.name) return

    await db.warehouses.put(after)
    await db.auditLogs.add(makeMutationAudit(
      'WAREHOUSE', before.id, 'UPDATE', { ...before }, { ...after },
      'Updated warehouse details',
    ))
    await db.syncOutbox.add(makeOutbox('WAREHOUSE', after.id, 'UPDATE', { warehouse: after }))
  })
}

/**
 * Uses soft archive only. A location with stock movement history cannot be archived,
 * because its ID is referenced by the append-only stock ledger.
 */
export async function setLocationArchived(branchId: string, archived: boolean): Promise<void> {
  await db.transaction(
    'rw',
    db.branches, db.warehouses, db.stockLedger, db.auditLogs, db.syncOutbox,
    async () => {
      const beforeBranch = await db.branches.get(branchId)
      if (!beforeBranch) throw new Error('Branch was not found.')
      const warehouses = await db.warehouses.where('branchId').equals(branchId).toArray()
      const targetStatus = archived ? 'ARCHIVED' : 'ACTIVE'

      if (beforeBranch.status === targetStatus) return
      if (archived) {
        const movementCount = await db.stockLedger.where('branchId').equals(branchId).count()
        if (movementCount > 0) {
          throw new Error('This branch has stock movement history. Move or reconcile stock first; historical branches cannot be archived.')
        }
      }

      const now = new Date().toISOString()
      const afterBranch: BranchRecord = {
        ...beforeBranch,
        status: targetStatus,
        type: 'BRANCH',
        updatedAt: now,
      }
      await db.branches.put(afterBranch)
      await db.auditLogs.add(makeMutationAudit(
        'BRANCH', branchId, archived ? 'ARCHIVE' : 'RESTORE',
        { ...beforeBranch }, { ...afterBranch },
        archived ? 'Soft archived branch setup record' : 'Restored branch setup record',
      ))
      await db.syncOutbox.add(makeOutbox(
        'BRANCH', branchId, archived ? 'ARCHIVE' : 'UPDATE', { branch: afterBranch },
      ))

      for (const beforeWarehouse of warehouses) {
        if (beforeWarehouse.status === targetStatus) continue
        const afterWarehouse: WarehouseRecord = {
          ...beforeWarehouse,
          status: targetStatus,
          updatedAt: now,
        }
        await db.warehouses.put(afterWarehouse)
        await db.auditLogs.add(makeMutationAudit(
          'WAREHOUSE', beforeWarehouse.id, archived ? 'ARCHIVE' : 'RESTORE',
          { ...beforeWarehouse }, { ...afterWarehouse },
          archived ? 'Branch archived; warehouse soft archived' : 'Branch restored; warehouse restored',
        ))
        await db.syncOutbox.add(makeOutbox(
          'WAREHOUSE', beforeWarehouse.id, archived ? 'ARCHIVE' : 'UPDATE',
          { warehouse: afterWarehouse },
        ))
      }
    },
  )
}
