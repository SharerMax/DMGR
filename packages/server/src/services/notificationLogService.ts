import type { NotificationLogFilters } from '../models/notificationLog.js'
import { getNotificationLogById, getNotificationLogs } from '../models/notificationLog.js'

export interface NotificationLogQuery extends NotificationLogFilters {
  page: number
  pageSize: number
}

export async function getUserNotificationLogs(
  userId: number,
  query: NotificationLogQuery,
) {
  return getNotificationLogs({ ...query, userId }, query.page, query.pageSize)
}

export async function getUserNotificationLog(userId: number, logId: number) {
  const log = await getNotificationLogById(logId)
  if (!log) {
    return null
  }
  if (log.userId !== userId) {
    return null
  }
  return log
}
