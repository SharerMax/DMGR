import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Lock, Mail, Save, User } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth'

interface EmailFormValues {
  email: string
}

interface PasswordFormValues {
  currentPassword: string
  newPassword: string
}

export default function Profile() {
  const { user, updateProfile, changePassword } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
  } = useForm<EmailFormValues>({
    defaultValues: {
      email: user?.email || '',
    },
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormValues>({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
  })

  const onEmailSubmit = async (data: EmailFormValues) => {
    setLoading(true)
    try {
      await updateProfile(data.email || null)
      toast.success('邮箱更新成功')
    }
    catch (error: any) {
      toast.error(error.message || '更新失败')
    }
    finally {
      setLoading(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setPasswordLoading(true)
    try {
      await changePassword(data.currentPassword, data.newPassword)
      toast.success('密码修改成功')
      resetPasswordForm({ currentPassword: '', newPassword: '' })
    }
    catch (error: any) {
      toast.error(error.message || '修改密码失败')
    }
    finally {
      setPasswordLoading(false)
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">用户信息</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>用户名</Label>
              <Input value={user?.username || ''} disabled />
              <p className="text-xs text-gray-500">用户名不可修改</p>
            </div>
            <div className="space-y-2">
              <Label>注册时间</Label>
              <Input
                value={user?.createdAt ? format(new Date(user.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN }) : '-'}
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* 邮箱设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              邮箱设置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">邮箱地址</Label>
                <Input
                  id="email"
                  type="email"
                  {...registerEmail('email', {
                    pattern: {
                      value: /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/,
                      message: '请输入有效的邮箱地址',
                    },
                  })}
                  placeholder="example@email.com"
                  aria-invalid={!!emailErrors.email}
                />
                {emailErrors.email && (
                  <p className="text-xs text-red-500">{emailErrors.email.message}</p>
                )}
              </div>
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? '保存中...' : '保存邮箱'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 修改密码 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              修改密码
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">
                    当前密码
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    {...registerPassword('currentPassword', { required: '请输入当前密码' })}
                    placeholder="输入当前密码"
                    aria-invalid={!!passwordErrors.currentPassword}
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-xs text-red-500">{passwordErrors.currentPassword.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">
                    新密码
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...registerPassword('newPassword', {
                      required: '请输入新密码',
                      minLength: { value: 6, message: '密码至少6位' },
                    })}
                    placeholder="输入新密码（至少6位）"
                    aria-invalid={!!passwordErrors.newPassword}
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-xs text-red-500">{passwordErrors.newPassword.message}</p>
                  )}
                </div>
              </div>
              <Button type="submit" disabled={passwordLoading}>
                <Lock className="h-4 w-4 mr-2" />
                {passwordLoading ? '修改中...' : '修改密码'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
