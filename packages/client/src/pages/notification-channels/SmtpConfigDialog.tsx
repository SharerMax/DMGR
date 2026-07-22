import type { SmtpSetting, UpdateSmtpSettingInput } from '@/stores/smtpSettings'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SmtpFormValues {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

interface SmtpConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  smtpSetting: SmtpSetting | null
  saving: boolean
  onSubmit: (data: UpdateSmtpSettingInput) => Promise<void>
}

export function SmtpConfigDialog({
  open,
  onOpenChange,
  smtpSetting,
  saving,
  onSubmit,
}: SmtpConfigDialogProps) {
  const {
    register: registerSmtp,
    handleSubmit: handleSubmitSmtp,
    reset: resetSmtp,
    formState: { errors: smtpErrors },
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
    if (!open)
      return
    if (smtpSetting) {
      resetSmtp({
        host: smtpSetting.host,
        port: smtpSetting.port,
        user: smtpSetting.user,
        // 密码不回填，留空表示不修改
        pass: '',
        from: smtpSetting.from,
      })
    }
  }, [open, smtpSetting, resetSmtp])

  const onSubmitSmtp = async (data: SmtpFormValues) => {
    try {
      await onSubmit(data)
      toast.success('SMTP 配置已保存')
      onOpenChange(false)
    }
    catch (error: any) {
      toast.error(error.message || '保存 SMTP 配置失败')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>SMTP 服务器配置</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmitSmtp(onSubmitSmtp)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="smtp-host">
              SMTP 服务器地址
              <span className="text-status-danger ml-1">*</span>
            </Label>
            <Input
              id="smtp-host"
              {...registerSmtp('host', { required: '请输入 SMTP 服务器地址' })}
              placeholder="smtp.example.com"
            />
            {smtpErrors.host && (
              <p className="text-xs text-status-error">{smtpErrors.host.message}</p>
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
              {...registerSmtp('port', {
                required: '请输入端口',
                valueAsNumber: true,
                min: { value: 1, message: '端口必须大于 0' },
                max: { value: 65535, message: '端口必须小于 65536' },
              })}
              placeholder="587"
            />
            {smtpErrors.port && (
              <p className="text-xs text-status-error">{smtpErrors.port.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-user">
              用户名
              <span className="text-status-danger ml-1">*</span>
            </Label>
            <Input
              id="smtp-user"
              {...registerSmtp('user', { required: '请输入用户名' })}
              placeholder="user@example.com"
            />
            {smtpErrors.user && (
              <p className="text-xs text-status-error">{smtpErrors.user.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-pass">
              密码
              {smtpSetting?.pass && (
                <span className="text-status-danger ml-1">*</span>
              )}
            </Label>
            <Input
              id="smtp-pass"
              type="password"
              {...registerSmtp('pass', {
                required: smtpSetting?.pass ? false : '请输入密码',
              })}
              placeholder={smtpSetting?.pass ? '留空表示不修改' : '请输入密码'}
            />
            {smtpErrors.pass && (
              <p className="text-xs text-status-error">{smtpErrors.pass.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-from">
              发件人地址
              <span className="text-status-danger ml-1">*</span>
            </Label>
            <Input
              id="smtp-from"
              {...registerSmtp('from', { required: '请输入发件人地址' })}
              placeholder="noreply@example.com"
            />
            {smtpErrors.from && (
              <p className="text-xs text-status-error">{smtpErrors.from.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
