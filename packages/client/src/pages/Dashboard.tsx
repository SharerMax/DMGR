import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Database, Globe, Mail, RefreshCw, Server, TrendingDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'

const TYPE_LABELS: Record<string, string> = {
  expiry_reminder: '过期提醒',
  renewal_success: '续期成功',
  renewal_failed: '续期失败',
  sync_completed: '同步完成',
}

const STATUS_LABELS: Record<string, string> = {
  completed: '成功',
  failed: '失败',
  pending: '处理中',
  skipped: '已跳过',
  processing: '处理中',
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-status-success',
  failed: 'bg-status-error',
  pending: 'bg-status-warning',
  skipped: 'bg-status-disabled',
  processing: 'bg-status-info',
}

const TYPE_COLORS: Record<string, string> = {
  expiry_reminder: 'bg-status-warning',
  renewal_success: 'bg-status-success',
  renewal_failed: 'bg-status-error',
  sync_completed: 'bg-status-info',
}

function StatCard({ icon: Icon, label, value, color = 'text-primary', bgColor = 'bg-primary/10' }: {
  icon: typeof Globe
  label: string
  value: number
  color?: string
  bgColor?: string
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${bgColor}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              即将过期的域名
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              查看全部
            </Button>
          </CardHeader>
          <CardContent>
            {data.expiringDomains.length === 0
              ? (
                  <p className="text-muted-foreground text-center py-8">暂无即将过期的域名</p>
                )
              : (
                  <ScrollArea className="h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>域名</TableHead>
                          <TableHead className="text-right">服务商</TableHead>
                          <TableHead className="text-right">剩余天数</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.expiringDomains.map((domain) => {
                          const daysColor = domain.daysUntilExpiry <= 7 ? 'text-status-error' : domain.daysUntilExpiry <= 30 ? 'text-status-warning' : 'text-status-success'
                          return (
                            <TableRow key={domain.id} className="hover:cursor-pointer" onClick={() => navigate('/')}>
                              <TableCell className="font-medium">{domain.name}</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {domain.providerName || '-'}
                              </TableCell>
                              <TableCell className={`text-right font-medium ${daysColor}`}>
                                {domain.daysUntilExpiry}
                                天
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              最近通知
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/notification-logs')}>
              查看全部
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentNotifications.length === 0
              ? (
                  <p className="text-muted-foreground text-center py-8">暂无通知记录</p>
                )
              : (
                  <ScrollArea className="h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>类型</TableHead>
                          <TableHead>内容</TableHead>
                          <TableHead className="text-right">时间</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.recentNotifications.map(notification => (
                          <TableRow key={notification.id}>
                            <TableCell>
                              <Badge className={TYPE_COLORS[notification.type] || 'bg-status-info'}>
                                {TYPE_LABELS[notification.type] || notification.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="truncate max-w-xs">
                              {notification.domainName ? `${notification.domainName}: ` : ''}
                              {notification.content}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {notification.sentAt ? format(parseISO(notification.sentAt), 'MM-dd HH:mm') : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              最近续期记录
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/renewal-logs')}>
              查看全部
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentRenewals.length === 0
              ? (
                  <p className="text-muted-foreground text-center py-8">暂无续期记录</p>
                )
              : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>域名</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>消息</TableHead>
                        <TableHead className="text-right">时间</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentRenewals.map(renewal => (
                        <TableRow key={renewal.id}>
                          <TableCell className="font-medium">{renewal.domainName}</TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[renewal.status] || 'bg-status-info'}>
                              {STATUS_LABELS[renewal.status] || renewal.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="truncate max-w-md">
                            {renewal.message || '-'}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {format(parseISO(renewal.createdAt), 'MM-dd HH:mm')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
