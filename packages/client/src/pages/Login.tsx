import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth'

interface LoginFormValues {
  username: string
  password: string
  email?: string
}

export default function Login() {
  const navigate = useNavigate()
  const { login, register: registerUser } = useAuthStore()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: {
      username: '',
      password: '',
      email: '',
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await login(data.username, data.password)
      }
      else {
        await registerUser(data.username, data.password, data.email || undefined)
      }
      navigate('/')
    }
    catch (err: any) {
      setError(err.message || '操作失败')
    }
    finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    setError('')
    reset({ username: '', password: '', email: '' })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isLogin ? '登录' : '注册'}</CardTitle>
          <CardDescription>
            {isLogin ? '登录您的账户管理域名' : '创建新账户开始管理域名'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">
                {isLogin ? '用户名 / 邮箱' : '用户名'}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="username"
                type="text"
                {...register('username', { required: '请输入用户名' })}
                placeholder={isLogin ? '请输入用户名或邮箱' : '请输入用户名'}
                aria-invalid={!!errors.username}
              />
              {errors.username && (
                <p className="text-xs text-red-500">{errors.username.message}</p>
              )}
            </div>
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="email">邮箱（可选）</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email', {
                    pattern: {
                      value: /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/,
                      message: '请输入有效的邮箱地址',
                    },
                  })}
                  placeholder="请输入邮箱"
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">
                密码
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                {...register('password', {
                  required: '请输入密码',
                  minLength: { value: 6, message: '密码至少6位' },
                })}
                placeholder="请输入密码"
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={switchMode}
            >
              {isLogin ? '没有账户？立即注册' : '已有账户？立即登录'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
