import type { LucideIcon } from 'lucide-react'
import type { NotificationConfigType } from '@/stores/notificationConfigs'
import { Bell, CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useConfirm } from '@/hooks/useConfirm'
import { useNotificationConfigStore } from '@/stores/notificationConfigs'
import { ConfigCard } from './ConfigCard'

interface NotificationConfigFormValues {
  expiryReminderEnabled: boolean
  expiryDays: string
  renewalSuccessEnabled: boolean
  renewalFailedEnabled: boolean
  syncCompletedEnabled: boolean
}

interface ConfigMeta {
  label: string
  description: string
  icon: LucideIcon
}

const CONFIG_META: Record<NotificationConfigType, ConfigMeta> = {
  expiry_reminder: {
    label: '过期提醒',
    description: '域名即将过期时发送提醒通知',
    icon: Clock,
  },
  renewal_success: {
    label: '续期成功',
    description: '域名自动续期成功时发送通知',
    icon: CheckCircle2,
  },
  renewal_failed: {
    label: '续期失败',
    description: '域名自动续期失败时发送通知',
    icon: XCircle,
  },
  sync_completed: {
    label: '同步完成',
    description: '服务商域名同步完成时发送通知',
    icon: RefreshCw,
  },
}

export default function NotificationConfigs() {
  const { configs, loading, fetchConfigs, updateConfig, resetConfig } = useNotificationConfigStore()
  const { confirm } = useConfirm()

  const {
    register,
    reset,
    setValue,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<NotificationConfigFormValues>({
    defaultValues: {
      expiryReminderEnabled: true,
      expiryDays: '30',
      renewalSuccessEnabled: true,
      renewalFailedEnabled: true,
      syncCompletedEnabled: true,
    },
  })

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  const configMap = useMemo(() => {
    const map = new Map<string, typeof configs[0]>()
    configs.forEach(c => map.set(c.type, c))
    return map
  }, [configs])

  useEffect(() => {
    if (configs.length === 0) {
      return
    }
    const expiryReminder = configMap.get('expiry_reminder')
    reset({
      expiryReminderEnabled: configMap.get('expiry_reminder')?.enabled ?? true,
      expiryDays: expiryReminder?.expiryDays?.toString() ?? '30',
      renewalSuccessEnabled: configMap.get('renewal_success')?.enabled ?? true,
      renewalFailedEnabled: configMap.get('renewal_failed')?.enabled ?? true,
      syncCompletedEnabled: configMap.get('sync_completed')?.enabled ?? true,
    })
  }, [configs, configMap, reset])

  const watchedExpiryReminderEnabled = watch('expiryReminderEnabled')

  const onSubmit = async (data: NotificationConfigFormValues) => {
    try {
      await Promise.all([
        updateConfig('expiry_reminder', {
          enabled: data.expiryReminderEnabled,
          expiryDays: Number(data.expiryDays) || 30,
        }),
        updateConfig('renewal_success', { enabled: data.renewalSuccessEnabled }),
        updateConfig('renewal_failed', { enabled: data.renewalFailedEnabled }),
        updateConfig('sync_completed', { enabled: data.syncCompletedEnabled }),
      ])
      toast.success('通知配置已保存')
      await fetchConfigs()
    }
    catch (error: unknown) {
      const message = error instanceof Error ? error.message : '保存通知配置失败'
      toast.error(message)
    }
  }

  const handleReset = async (type: NotificationConfigType) => {
    const confirmed = await confirm({
      title: '重置通知配置',
      description: `确定要将「${CONFIG_META[type].label}」重置为默认值吗？`,
      confirmText: '重置',
      destructive: true,
    })
    if (!confirmed) {
      return
    }
    try {
      await resetConfig(type)
      toast.success('已重置为默认值')
    }
    catch (error: unknown) {
      const message = error instanceof Error ? error.message : '重置失败'
      toast.error(message)
    }
  }

  if (loading && configs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            通知配置
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            配置各类通知的开关，关闭后将不再发送对应类型的通知
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <ConfigCard
          meta={CONFIG_META.expiry_reminder}
          switchId="config-expiry-reminder"
          enabled={watch('expiryReminderEnabled')}
          onEnabledChange={v => setValue('expiryReminderEnabled', v)}
          onReset={() => handleReset('expiry_reminder')}
        >
          {watchedExpiryReminderEnabled && (
            <div className="flex items-end gap-3 pl-8">
              <div className="space-y-2 flex-1 max-w-xs">
                <Label htmlFor="expiryDays">
                  提前提醒天数
                  <span className="text-status-danger ml-1">*</span>
                </Label>
                <Input
                  id="expiryDays"
                  type="number"
                  {...register('expiryDays', {
                    required: '请输入提醒天数',
                    min: { value: 1, message: '天数不能小于1' },
                    max: { value: 365, message: '天数不能超过365' },
                  })}
                  placeholder="30"
                  aria-invalid={!!errors.expiryDays}
                />
                {errors.expiryDays && (
                  <p className="text-xs text-status-error">{errors.expiryDays.message}</p>
                )}
              </div>
              <span className="text-sm text-muted-foreground pb-2">天前发送提醒</span>
            </div>
          )}
        </ConfigCard>

        <ConfigCard
          meta={CONFIG_META.renewal_success}
          switchId="config-renewal-success"
          enabled={watch('renewalSuccessEnabled')}
          onEnabledChange={v => setValue('renewalSuccessEnabled', v)}
          onReset={() => handleReset('renewal_success')}
        />

        <ConfigCard
          meta={CONFIG_META.renewal_failed}
          switchId="config-renewal-failed"
          enabled={watch('renewalFailedEnabled')}
          onEnabledChange={v => setValue('renewalFailedEnabled', v)}
          onReset={() => handleReset('renewal_failed')}
        />

        <ConfigCard
          meta={CONFIG_META.sync_completed}
          switchId="config-sync-completed"
          enabled={watch('syncCompletedEnabled')}
          onEnabledChange={v => setValue('syncCompletedEnabled', v)}
          onReset={() => handleReset('sync_completed')}
        />

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? '保存中...' : '保存配置'}
          </Button>
        </div>
      </form>
    </div>
  )
}
