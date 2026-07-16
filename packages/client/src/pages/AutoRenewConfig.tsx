import { CronExpressionParser } from 'cron-parser'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { AlertCircle, Clock, Play, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import api from '@/lib/api'

type TriggerMode = 'manual' | 'scheduled'

interface AutoRenewConfigData {
  enabled: boolean
  triggerMode: TriggerMode
  cronExpression: string
}

// node-cron 使用 5 位格式: 分 时 日 月 周 (不支持 ?)
const DEFAULT_CRON = '0 2 * * *' // 每天凌晨2点

// 使用 cron-parser 计算下次运行时间 (转换为 6 位格式用于解析)
function getNextRunTimes(expression: string, count: number = 3): Date[] | null {
  try {
    // 将 5 位转换为 6 位格式: 秒 分 时 日 月 周
    const sixFieldFormat = expression.replace(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/, '$1 $2 $3 $4 $5 ?')
    const interval = CronExpressionParser.parse(sixFieldFormat, { currentDate: new Date() })
    const results: Date[] = []

    for (let i = 0; i < count; i++) {
      const next = interval.next()
      if (next) {
        // 将 CronDate 转换为 Date
        results.push(new Date(next.toString()))
      }
      else {
        break
      }
    }

    return results.length > 0 ? results : null
  }
  catch {
    return null
  }
}

// 验证 cron 表达式 (5 位格式)
function isValidCronExpression(expression: string): boolean {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5)
    return false
  if (expression.includes('?'))
    return false
  try {
    CronExpressionParser.parse(expression)
    return true
  }
  catch {
    return false
  }
}

export default function AutoRenewConfig() {
  const [config, setConfig] = useState<AutoRenewConfigData>({
    enabled: false,
    triggerMode: 'manual',
    cronExpression: DEFAULT_CRON,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [nextRunTimes, setNextRunTimes] = useState<Date[]>([])
  const [cronError, setCronError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // 加载配置
  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await api.get('/renewal-logs/config')
        setConfig({
          enabled: response.data.enabled,
          triggerMode: response.data.triggerMode,
          cronExpression: response.data.cronExpression || DEFAULT_CRON,
        })
      }
      catch (error) {
        console.error('加载配置失败:', error)
      }
      finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  // 计算下次运行时间
  useEffect(() => {
    if (config.triggerMode === 'scheduled' && config.cronExpression) {
      if (!isValidCronExpression(config.cronExpression)) {
        setCronError('无效的 cron 表达式')
        setNextRunTimes([])
        return
      }

      const times = getNextRunTimes(config.cronExpression)
      if (times) {
        setNextRunTimes(times)
        setCronError(null)
      }
      else {
        setCronError('无效的 cron 表达式')
        setNextRunTimes([])
      }
    }
    else {
      setNextRunTimes([])
      setCronError(null)
    }
  }, [config.triggerMode, config.cronExpression])

  // 保存配置
  const handleSave = async () => {
    if (cronError && config.triggerMode === 'scheduled') {
      return
    }

    setSaving(true)
    try {
      await api.put('/renewal-logs/config', {
        enabled: config.enabled,
        triggerMode: config.triggerMode,
        cronExpression: config.cronExpression,
      })
      setSaved(true)
      setTimeout(setSaved, 3000, false)
    }
    catch (error) {
      console.error('保存配置失败:', error)
    }
    finally {
      setSaving(false)
    }
  }

  // 手动触发
  const handleTriggerNow = async () => {
    setTriggering(true)
    try {
      await api.post('/renewal-logs/trigger')
      // 可以添加成功提示
    }
    catch (error) {
      console.error('触发失败:', error)
    }
    finally {
      setTriggering(false)
    }
  }

  const cronExamples = [
    { expression: '0 2 * * *', desc: '每天凌晨2点' },
    { expression: '0 2 * * 1', desc: '每周一凌晨2点' },
    { expression: '0 2 1 * *', desc: '每月1号凌晨2点' },
    { expression: '0 */6 * * *', desc: '每6小时' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">自动续期配置</h2>
        <Button
          onClick={handleSave}
          className="gap-2"
          disabled={saving || (!!cronError && config.triggerMode === 'scheduled')}
        >
          <Settings className="h-4 w-4" />
          {saving ? '保存中...' : saved ? '已保存' : '保存配置'}
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Switch
              checked={config.enabled}
              onCheckedChange={checked => setConfig({ ...config, enabled: checked })}
            />
            启用自动续期
          </CardTitle>
          <CardDescription>
            启用后，系统将根据配置的触发方式自动检测并续期即将过期的域名
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <Label className="mb-3 block">触发方式</Label>
              <div className="flex gap-4">
                <Button
                  variant={config.triggerMode === 'manual' ? 'default' : 'outline'}
                  onClick={() => setConfig({ ...config, triggerMode: 'manual' })}
                  className="flex-1 gap-2"
                >
                  <Play className="h-4 w-4" />
                  手动触发
                </Button>
                <Button
                  variant={config.triggerMode === 'scheduled' ? 'default' : 'outline'}
                  onClick={() => setConfig({ ...config, triggerMode: 'scheduled' })}
                  className="flex-1 gap-2"
                >
                  <Clock className="h-4 w-4" />
                  定时任务
                </Button>
              </div>
            </div>

            {config.triggerMode === 'manual' && (
              <div className="p-4 rounded-lg border text-muted-foreground bg-muted">
                <p className="text-sm">
                  选择手动触发后，您需要在域名管理页面手动点击续期按钮来触发域名续期操作。
                </p>
                <Button
                  onClick={handleTriggerNow}
                  className="mt-4 gap-2"
                  disabled={!config.enabled || triggering}
                >
                  <Play className="h-4 w-4" />
                  {triggering ? '执行中...' : '立即执行续期检查'}
                </Button>
              </div>
            )}

            {config.triggerMode === 'scheduled' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cron_expression">Cron 表达式</Label>
                  <Input
                    id="cron_expression"
                    value={config.cronExpression}
                    onChange={e => setConfig({ ...config, cronExpression: e.target.value })}
                    placeholder="0 0 2 * * *"
                    className={cronError ? 'border-status-error' : ''}
                  />
                  {cronError && (
                    <p className="text-status-error text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {cronError}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="mb-2 block">常用表达式</Label>
                  <div className="flex flex-wrap gap-2">
                    {cronExamples.map((example, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setConfig({ ...config, cronExpression: example.expression })}
                        className="gap-2"
                      >
                        <code className="text-xs">{example.expression}</code>
                        <span className="text-xs text-secondary-foreground">{example.desc}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-muted text-muted-foreground rounded-lg">
                  <Label className="mb-3 block font-medium">预计运行时间</Label>
                  {nextRunTimes.length > 0
                    ? (
                        <div className="space-y-2">
                          {nextRunTimes.map((time, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <span>
                                第
                                {index + 1}
                                次:
                              </span>
                              <span className="font-medium">
                                {format(time, 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    : (
                        <p className="text-sm">请输入有效的 cron 表达式</p>
                      )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cron 表达式说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <p>Cron 表达式格式（5位）：</p>
            <code className="block p-2 bg-muted text-muted-foreground rounded text-xs">分 时 日 月 周</code>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>*</strong>
                : 匹配任意值
              </li>
              <li>
                <strong>/n</strong>
                : 每隔n单位执行
              </li>
              <li>
                <strong>a-b</strong>
                : 范围，从a到b
              </li>
              <li>
                <strong>a,b,c</strong>
                : 枚举值
              </li>
              <li>
                <strong>周</strong>
                : 0=周日, 1=周一, ..., 6=周六
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
