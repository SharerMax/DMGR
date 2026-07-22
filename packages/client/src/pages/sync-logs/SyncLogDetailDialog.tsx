import type { SyncDetails, SyncLog } from '@/stores/syncLogs'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-status-success',
  failed: 'bg-status-error',
  partial: 'bg-status-warning',
}

const STATUS_LABELS: Record<string, string> = {
  success: '成功',
  failed: '失败',
  partial: '部分成功',
}

function parseDetails(details: string | null): SyncDetails | null {
  if (!details) {
    return null
  }
  try {
    return JSON.parse(details) as SyncDetails
  }
  catch {
    return null
  }
}

interface SyncLogDetailDialogProps {
  log: SyncLog | null
  onOpenChange: (open: boolean) => void
}

export function SyncLogDetailDialog({ log, onOpenChange }: SyncLogDetailDialogProps) {
  const details = parseDetails(log?.details ?? null)

  return (
    <Dialog open={!!log} onOpenChange={open => !open && onOpenChange(false)}>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>同步详情</DialogTitle>
          <DialogDescription>
            {log?.provider?.name}
            {' · '}
            {log && format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
          </DialogDescription>
        </DialogHeader>

        {log && (
          <div className="space-y-4 -mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4">
            {/* 状态概览 */}
            <div className="flex items-center gap-4">
              <Badge
                variant="secondary"
                className={`${STATUS_COLORS[log.status] || 'bg-gray-500'} text-white`}
              >
                {STATUS_LABELS[log.status] || log.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                新增域名
                {' '}
                {log.domainsSynced}
                {' '}
                · 新增 DNS
                {' '}
                {log.dnsInserted}
                {' '}
                · 删除 DNS
                {' '}
                {log.dnsDeleted}
              </span>
            </div>

            {log.error && (
              <div className="rounded-md bg-status-error-bg-light p-3 text-sm text-status-error">
                {log.error}
              </div>
            )}

            {details && (
              <>
                {/* 新增域名 */}
                {details.domainsAdded.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-status-success">
                      新增域名（
                      {details.domainsAdded.length}
                      ）
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {details.domainsAdded.map(d => (
                        <Badge key={d.name} variant="outline" className="text-status-success">
                          {d.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 新增 DNS 记录 */}
                {details.dnsInserted.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-status-success">
                      新增 DNS 记录（
                      {details.dnsInserted.length}
                      ）
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>域名</TableHead>
                          <TableHead>类型</TableHead>
                          <TableHead>主机名</TableHead>
                          <TableHead>值</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {details.dnsInserted.map((r, i) => (
                          <TableRow key={`ins-${i}`}>
                            <TableCell className="font-medium">{r.domain}</TableCell>
                            <TableCell>{r.type}</TableCell>
                            <TableCell>{r.name}</TableCell>
                            <TableCell className="max-w-48 truncate">{r.value}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* 删除 DNS 记录 */}
                {details.dnsDeleted.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-status-danger">
                      删除 DNS 记录（
                      {details.dnsDeleted.length}
                      ）
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>域名</TableHead>
                          <TableHead>类型</TableHead>
                          <TableHead>主机名</TableHead>
                          <TableHead>值</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {details.dnsDeleted.map((r, i) => (
                          <TableRow key={`del-${i}`}>
                            <TableCell className="font-medium">{r.domain}</TableCell>
                            <TableCell>{r.type}</TableCell>
                            <TableCell>{r.name}</TableCell>
                            <TableCell className="max-w-48 truncate">{r.value}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* 无变更 */}
                {details.domainsAdded.length === 0 && details.dnsInserted.length === 0 && details.dnsDeleted.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">本次同步无变更</div>
                )}
              </>
            )}

            {!details && log.status === 'success' && (
              <div className="text-center py-4 text-muted-foreground">无变更详情</div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
