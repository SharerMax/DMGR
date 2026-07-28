import type { SmtpSetting, UpdateSmtpSettingInput } from '@/stores/smtpSettings'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { useSmtpSettingStore } from '@/stores/smtpSettings'

interface SmtpFormValues {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

export function SmtpCard() {
  const { setting, fetchSmtpSetting, updateSmtpSetting } = useSmtpSettingStore()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SmtpFormValues>({
    defaultValues: {
      host: '',
      port: 587,
      user: '',
      pass: '',
      from: '',
    },
  })

  useEffect(() => {
    fetchSmtpSetting()
  }, [fetchSmtpSetting])

  useEffect(() => {
    if (setting) {
      reset({
        host: setting.host,
        port: setting.port,
        user: setting.user,
        // 密码不回填，留空表示不修改
        pass: '',
        from: setting.from,
      })
    }
  }, [setting, reset])

  const onSubmit = async (data: SmtpFormValues) => {
    try {
      const payload: UpdateSmtpSettingInput = {
        host: data.host,
        port: data.port,
        user: data.user,
        from: data.from,
      }
      // 密码：空表示不修改
      if (data.pass) {
        payload.pass = data.pass
      }
      await updateSmtpSetting(payload)
      toast.add({ title: 'SMTP 配置已保存', type: 'success' })
    }
    catch (error: any) {
      toast.add({ title: error.message || '保存 SMTP 配置失败', type: 'error' })
    }
  }

  const configured = setting?.configured ?? false

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>SMTP 服务器</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${configured ? 'bg-status-success-bg text-status-success' : 'bg-status-warning-bg text-status-warning'}`}>
            {configured ? '已配置' : '未配置'}
          </span>
        </CardTitle>
        <CardDescription>
          用于发送邮件通知。环境变量（SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM）作为默认值，此处配置优先于环境变量。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="smtp-host">
                SMTP 服务器地址
                <span className="text-status-danger ml-1">*</span>
              </Label>
              <Input
                id="smtp-host"
                {...register('host', { required: '请输入 SMTP 服务器地址' })}
                placeholder="smtp.example.com"
              />
              {errors.host && (
                <p className="text-xs text-status-error">{errors.host.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">
                端口
                <span className="text-status-danger ml-1">*</span>
              </Label>
              <Input
                id="smtp-port"
                type="number"
                {...register('port', {
                  required: '请输入端口',
                  valueAsNumber: true,
                  min: { value: 1, message: '端口必须大于 0' },
                  max: { value: 65535, message: '端口必须小于 65536' },
                })}
                placeholder="587"
              />
              {errors.port && (
                <p className="text-xs text-status-error">{errors.port.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-from">
                发件人地址
                <span className="text-status-danger ml-1">*</span>
              </Label>
              <Input
                id="smtp-from"
                {...register('from', { required: '请输入发件人地址' })}
                placeholder="noreply@example.com"
              />
              {errors.from && (
                <p className="text-xs text-status-error">{errors.from.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-user">
                用户名
                <span className="text-status-danger ml-1">*</span>
              </Label>
              <Input
                id="smtp-user"
                {...register('user', { required: '请输入用户名' })}
                placeholder="user@example.com"
              />
              {errors.user && (
                <p className="text-xs text-status-error">{errors.user.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-pass">
                密码
                {setting?.pass && (
                  <span className="text-status-danger ml-1">*</span>
                )}
              </Label>
              <Input
                id="smtp-pass"
                type="password"
                {...register('pass', {
                  required: setting?.pass ? false : '请输入密码',
                })}
                placeholder={setting?.pass ? '留空表示不修改' : '请输入密码'}
              />
              {errors.pass && (
                <p className="text-xs text-status-error">{errors.pass.message}</p>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存配置'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export type { SmtpSetting }
