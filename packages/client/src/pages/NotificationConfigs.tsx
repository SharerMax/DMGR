import type { LucideIcon } from 'lucide-react'
import type { NotificationConfigType } from '@/stores/notificationConfigs'
import { Bell, CheckCircle2, Clock, RefreshCw, RotateCcw, XCircle } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useConfirm } from '@/hooks/useConfirm'
import { useNotificationConfigStore } from '@/stores/notificationConfigs'

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
    control,
    register,
    reset,
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
        {/* 过期提醒 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">{CONFIG_META.expiry_reminder.label}</CardTitle>
                  <CardDescription className="mt-1">{CONFIG_META.expiry_reminder.description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Controller
                  control={control}
                  name="expiryReminderEnabled"
                  render={({ field }) => (
                    <Switch
                      id="config-expiry-reminder"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-status-danger"
                  onClick={() => handleReset('expiry_reminder')}
                  title="重置为默认值"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          {watchedExpiryReminderEnabled && (
            <CardContent>
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
            </CardContent>
          )}
        </Card>

        {/* 续期成功 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">{CONFIG_META.renewal_success.label}</CardTitle>
                  <CardDescription className="mt-1">{CONFIG_META.renewal_success.description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Controller
                  control={control}
                  name="renewalSuccessEnabled"
                  render={({ field }) => (
                    <Switch
                      id="config-renewal-success"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-status-danger"
                  onClick={() => handleReset('renewal_success')}
                  title="重置为默认值"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 续期失败 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">{CONFIG_META.renewal_failed.label}</CardTitle>
                  <CardDescription className="mt-1">{CONFIG_META.renewal_failed.description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Controller
                  control={control}
                  name="renewalFailedEnabled"
                  render={({ field }) => (
                    <Switch
                      id="config-renewal-failed"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-status-danger"
                  onClick={() => handleReset('renewal_failed')}
                  title="重置为默认值"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 同步完成 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <RefreshCw className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">{CONFIG_META.sync_completed.label}</CardTitle>
                  <CardDescription className="mt-1">{CONFIG_META.sync_completed.description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Controller
                  control={control}
                  name="syncCompletedEnabled"
                  render={({ field }) => (
                    <Switch
                      id="config-sync-completed"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-status-danger"
                  onClick={() => handleReset('sync_completed')}
                  title="重置为默认值"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? '保存中...' : '保存配置'}
          </Button>
        </div>
      </form>
    </div>
  )
}
