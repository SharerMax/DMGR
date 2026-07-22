import type { Domain } from '@/stores/domains'
import { differenceInDays, format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Pencil, Settings, Trash2 } from 'lucide-react'
import { DataTablePagination } from '@/components/DataTablePagination'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface DomainTableProps {
  domains: Domain[]
  loading: boolean
  currentPage: number
  itemsPerPage: number
  total: number
  canManageDns: (providerId: number | null | undefined) => boolean
  onPageChange: (page: number) => void
  onItemsPerPageChange: (size: number) => void
  onEdit: (domain: Domain) => void
  onDelete: (id: number) => void
  onManageDns: (domainId: number) => void
}

function getExpiryStatus(expiryDate: string | null) {
  if (!expiryDate)
    return { text: '未知', color: 'text-status-disabled', bg: 'bg-status-disabled-bg' }

  const days = differenceInDays(parseISO(expiryDate), new Date())
  if (days < 0)
    return { text: '已过期', color: 'text-status-error', bg: 'bg-status-error-bg' }
  if (days <= 7)
    return { text: `${days}天后过期`, color: 'text-status-error', bg: 'bg-status-error-bg' }
  if (days <= 30)
    return { text: `${days}天后过期`, color: 'text-status-warning', bg: 'bg-status-warning-bg' }
  if (days <= 90)
    return { text: `${days}天后过期`, color: 'text-status-warning', bg: 'bg-status-warning-bg' }
  return { text: `${days}天后过期`, color: 'text-status-success', bg: 'bg-status-success-bg' }
}

export function DomainTable({
  domains,
  loading,
  currentPage,
  itemsPerPage,
  total,
  canManageDns,
  onPageChange,
  onItemsPerPageChange,
  onEdit,
  onDelete,
  onManageDns,
}: DomainTableProps) {
  return (
    <Card>
      <CardContent>
        {loading
          ? (
              <div className="text-center py-12">加载中...</div>
            )
          : total === 0
            ? (
                <div className="text-center py-12 text-muted-foreground">
                  暂无域名，点击上方按钮添加
                </div>
              )
            : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>域名</TableHead>
                        <TableHead>服务商</TableHead>
                        <TableHead>过期日期</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>续期价格</TableHead>
                        <TableHead className="w-35">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {domains.map((domain) => {
                        const status = getExpiryStatus(domain.expiryDate)
                        return (
                          <TableRow key={domain.id}>
                            <TableCell className="font-medium">{domain.name}</TableCell>
                            <TableCell>{domain.provider_name || '未设置'}</TableCell>
                            <TableCell>
                              {domain.expiryDate ? format(parseISO(domain.expiryDate), 'yyyy-MM-dd', { locale: zhCN }) : '-'}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.color}`}>
                                {status.text}
                              </span>
                              {domain.autoRenew && (
                                <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-status-info-bg text-status-info">
                                  自动续期
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {domain.renewalPrice ? `¥${domain.renewalPrice}` : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onEdit(domain)}
                                  title="编辑"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {canManageDns(domain.providerId) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onManageDns(domain.id)}
                                    title="DNS记录"
                                  >
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-status-danger"
                                  onClick={() => onDelete(domain.id)}
                                  title="删除"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  <div className="border-t">
                    <DataTablePagination
                      itemsPerPage={itemsPerPage}
                      totalItems={total}
                      currentPage={currentPage}
                      onPageChange={onPageChange}
                      onItemsPerPageChange={onItemsPerPageChange}
                    />
                  </div>
                </>
              )}
      </CardContent>
    </Card>
  )
}
