import type { ExpiringDomain } from '@/stores/dashboard'
import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ExpiringDomainsCardProps {
  domains: ExpiringDomain[]
  onViewAll: () => void
  onDomainClick: () => void
}

export function ExpiringDomainsCard({ domains, onViewAll, onDomainClick }: ExpiringDomainsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          即将过期的域名
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          查看全部
        </Button>
      </CardHeader>
      <CardContent>
        {domains.length === 0
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
                    {domains.map((domain) => {
                      const daysColor = domain.daysUntilExpiry <= 7 ? 'text-status-error' : domain.daysUntilExpiry <= 30 ? 'text-status-warning' : 'text-status-success'
                      return (
                        <TableRow key={domain.id} className="hover:cursor-pointer" onClick={onDomainClick}>
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
  )
}
