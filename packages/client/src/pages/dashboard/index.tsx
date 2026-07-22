import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Database, Globe, RefreshCw, Server, TrendingDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { ExpiringDomainsCard } from './ExpiringDomainsCard'
import { RecentNotificationsCard } from './RecentNotificationsCard'
import { RecentRenewalsCard } from './RecentRenewalsCard'
import { StatCard } from './StatCard'

export default function Dashboard() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const { data, loading, fetchData } = useDashboardStore()
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    if (token) {
      fetchData()
    }
    setCurrentDate(new Date())
  }, [token, fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        暂无数据
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">概览</h1>
          <p className="text-muted-foreground mt-1">
            {format(currentDate, 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
          </p>
        </div>
        <Button onClick={() => fetchData()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新数据
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Globe} label="域名总数" value={data.stats.totalDomains} />
        <StatCard icon={Server} label="服务商数量" value={data.stats.totalProviders} />
        <StatCard icon={Database} label="活跃域名" value={data.stats.activeDomains} color="text-status-success" bgColor="bg-status-success-bg" />
        <StatCard icon={TrendingDown} label="即将过期" value={data.stats.expiringDomains} color="text-status-warning" bgColor="bg-status-warning-bg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpiringDomainsCard
          domains={data.expiringDomains}
          onViewAll={() => navigate('/')}
          onDomainClick={() => navigate('/')}
        />
        <RecentNotificationsCard
          notifications={data.recentNotifications}
          onViewAll={() => navigate('/notification-logs')}
        />
        <RecentRenewalsCard
          renewals={data.recentRenewals}
          onViewAll={() => navigate('/renewal-logs')}
        />
      </div>
    </div>
  )
}
