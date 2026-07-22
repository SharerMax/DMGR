import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

interface ConfigMeta {
  label: string
  description: string
  icon: LucideIcon
}

interface ConfigCardProps {
  meta: ConfigMeta
  switchId: string
  enabled: boolean
  onEnabledChange: (value: boolean) => void
  onReset: () => void
  children?: ReactNode
}

export function ConfigCard({
  meta,
  switchId,
  enabled,
  onEnabledChange,
  onReset,
  children,
}: ConfigCardProps) {
  const Icon = meta.icon
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">{meta.label}</CardTitle>
              <CardDescription className="mt-1">{meta.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id={switchId}
              checked={enabled}
              onCheckedChange={onEnabledChange}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-status-danger"
              onClick={onReset}
              title="重置为默认值"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  )
}
