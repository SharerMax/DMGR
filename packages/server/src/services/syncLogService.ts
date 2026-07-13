import type { PaginatedSyncLogs, SyncLogFilters } from '../models/syncLog.js'
import { getSyncLogById, getSyncLogs } from '../models/syncLog.js'

export interface SyncLogQuery extends SyncLogFilters {
  page: number
  pageSize: number
}

export async function getUserSyncLogs(
  userId: number,
  query: SyncLogQuery,
): Promise<PaginatedSyncLogs> {
  return getSyncLogs({ ...query, userId }, query.page, query.pageSize)
}

export async function getUserSyncLog(userId: number, logId: number) {
  const log = await getSyncLogById(logId)
  if (!log) {
    return null
  }
  if (log.userId !== userId) {
    return null
  }
  return log
}
