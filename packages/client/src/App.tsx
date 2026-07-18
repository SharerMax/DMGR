import { Bell, FileText, Globe, LogOut, Moon, RefreshCw, Server, Settings, Sun, SunMoon, User } from 'lucide-react'
import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router'
import { Toaster } from 'sonner'
import Logo from '@/components/Logo'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { ConfirmDialogProvider, useConfirm } from '@/hooks/useConfirm'
import AutoRenewConfig from '@/pages/AutoRenewConfig'
import Dashboard from '@/pages/Dashboard'
import Domains from '@/pages/Domains'
import Login from '@/pages/Login'
import NotificationChannels from '@/pages/NotificationChannels'
import NotificationConfigs from '@/pages/NotificationConfigs'
import NotificationLogs from '@/pages/NotificationLogs'
import Profile from '@/pages/Profile'
import Providers from '@/pages/Providers'
import RenewalLogs from '@/pages/RenewalLogs'
import SyncLogs from '@/pages/SyncLogs'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const { mode, setMode } = useThemeStore()
  const navigate = useNavigate()
  const { confirm } = useConfirm()

  const getThemeIcon = () => {
    if (mode === 'dark')
      return <Moon className="h-4 w-4" />
    if (mode === 'light')
      return <Sun className="h-4 w-4" />
    return <SunMoon className="h-4 w-4" />
  }

  function handleLogout() {
    confirm({
      title: '确认退出登录吗？',
      description: '退出登录后将无法访问域名管理系统',
      confirmText: '退出登录',
      cancelText: '取消',
      destructive: true,
    }).then(confirm => confirm && logout())
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                <Logo className="h-6 w-6" />
                <span className="font-bold text-lg">域名管理系统</span>
              </div>
              <nav className="flex gap-1">
                <NavigationMenu viewport={false} className="justify-start">
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger>
                        <Globe className="h-4 w-4 mr-2" />
                        域名
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="grid w-50 gap-1">
                          <li>
                            <NavigationMenuLink onClick={() => navigate('/domains')}>
                              <Globe className="mr-2 h-4 w-4" />
                              域名列表
                            </NavigationMenuLink>
                          </li>
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>

                    <NavigationMenuItem>
                      <NavigationMenuTrigger>
                        <Server className="h-4 w-4 mr-2" />
                        服务商
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="grid w-50 gap-1">
                          <li>
                            <NavigationMenuLink onClick={() => navigate('/providers')}>
                              <Server className="mr-2 h-4 w-4" />
                              服务商列表
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink onClick={() => navigate('/sync-logs')}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              同步记录
                            </NavigationMenuLink>
                          </li>
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>

                    <NavigationMenuItem>
                      <NavigationMenuTrigger>
                        <Bell className="h-4 w-4 mr-2" />
                        通知
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="grid w-50 gap-1">
                          <li>
                            <NavigationMenuLink onClick={() => navigate('/notification-configs')}>
                              <Settings className="mr-2 h-4 w-4" />
                              通知配置
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink onClick={() => navigate('/notification-channels')}>
                              <Settings className="mr-2 h-4 w-4" />
                              渠道配置
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink onClick={() => navigate('/notification-logs')}>
                              <FileText className="mr-2 h-4 w-4" />
                              通知记录
                            </NavigationMenuLink>
                          </li>
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>

                    <NavigationMenuItem>
                      <NavigationMenuTrigger>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        续期
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="grid w-50 gap-1">
                          <li>
                            <NavigationMenuLink onClick={() => navigate('/auto-renew-config')}>
                              <Settings className="mr-2 h-4 w-4" />
                              续期配置
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink onClick={() => navigate('/renewal-logs')}>
                              <FileText className="mr-2 h-4 w-4" />
                              续期日志
                            </NavigationMenuLink>
                          </li>
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    {getThemeIcon()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setMode('system')}>
                    <SunMoon className="mr-2 h-4 w-4" />
                    跟随系统
                    {mode === 'system' && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMode('light')}>
                    <Sun className="mr-2 h-4 w-4" />
                    亮色模式
                    {mode === 'light' && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMode('dark')}>
                    <Moon className="mr-2 h-4 w-4" />
                    暗色模式
                    {mode === 'dark' && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 text-sm"
              >
                <User className="h-4 w-4" />
                {user?.username}
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                退出
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Layout>{children}</Layout>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={(
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/domains"
        element={(
          <ProtectedRoute>
            <Domains />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/providers"
        element={(
          <ProtectedRoute>
            <Providers />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/notification-channels"
        element={(
          <ProtectedRoute>
            <NotificationChannels />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/notification-configs"
        element={(
          <ProtectedRoute>
            <NotificationConfigs />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/notification-logs"
        element={(
          <ProtectedRoute>
            <NotificationLogs />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/profile"
        element={(
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/renewal-logs"
        element={(
          <ProtectedRoute>
            <RenewalLogs />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/auto-renew-config"
        element={(
          <ProtectedRoute>
            <AutoRenewConfig />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/sync-logs"
        element={(
          <ProtectedRoute>
            <SyncLogs />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  const { initTheme } = useThemeStore()

  useEffect(() => {
    initTheme()
  }, [initTheme])

  return (
    <ConfirmDialogProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <AppRoutes />
      </BrowserRouter>
    </ConfirmDialogProvider>
  )
}

export default App
