import { Bell, Globe, LogOut, Server, User } from 'lucide-react'
import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import Domains from '@/pages/Domains'
import Login from '@/pages/Login'
import NotificationChannels from '@/pages/NotificationChannels'
import Profile from '@/pages/Profile'
import Providers from '@/pages/Providers'
import { useAuthStore } from '@/stores/auth'

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                <Globe className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">域名管理系统</span>
              </div>
              <nav className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                  <Globe className="h-4 w-4 mr-2" />
                  域名管理
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/providers')}>
                  <Server className="h-4 w-4 mr-2" />
                  服务商管理
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/notification-channels')}>
                  <Bell className="h-4 w-4 mr-2" />
                  通知渠道
                </Button>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 text-sm"
              >
                <User className="h-4 w-4" />
                {user?.username}
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
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
        path="/profile"
        element={(
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
