// 通知类型标签（Dashboard / NotificationLogs 共用）
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  expiry_reminder: '过期提醒',
  renewal_success: '续期成功',
  renewal_failed: '续期失败',
  sync_completed: '同步完成',
}

// 续期状态标签（Dashboard / RenewalLogs 共用）
export const RENEWAL_STATUS_LABELS: Record<string, string> = {
  completed: '成功',
  failed: '失败',
  pending: '处理中',
  skipped: '已跳过',
  processing: '处理中',
}

// 续期状态颜色（Dashboard / RenewalLogs 共用）
export const RENEWAL_STATUS_COLORS: Record<string, string> = {
  completed: 'bg-status-success',
  failed: 'bg-status-error',
  pending: 'bg-status-warning',
  skipped: 'bg-status-disabled',
  processing: 'bg-status-info',
}
