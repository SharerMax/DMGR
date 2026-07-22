import type { RecentRenewal } from '@/stores/dashboard'
import { format, parseISO } from 'date-fns'
import { RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RENEWAL_STATUS_COLORS, RENEWAL_STATUS_LABELS } from '@/lib/constants'

interface RecentRenewalsCardProps {
  renewals: RecentRenewal[]
  onViewAll: () => void
}

export function RecentRenewalsCard({ renewals, onViewAll }: RecentRenewalsCardProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          最近续期记录
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          查看全部
        </Button>
      </CardHeader>
      <CardContent>
        {renewals.length === 0
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
                  {renewals.map(renewal => (
                    <TableRow key={renewal.id}>
                      <TableCell className="font-medium">{renewal.domainName}</TableCell>
                      <TableCell>
                        <Badge className={RENEWAL_STATUS_COLORS[renewal.status] || 'bg-status-info'}>
                          {RENEWAL_STATUS_LABELS[renewal.status] || renewal.status}
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
  )
}
