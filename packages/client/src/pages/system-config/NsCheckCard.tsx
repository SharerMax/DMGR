import type { NsCheckSetting, NsCheckTestResult, UpdateNsCheckSettingInput } from '@/stores/nsCheckSettings'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { useNsCheckSettingStore } from '@/stores/nsCheckSettings'

interface NsCheckFormValues {
  server: string
}

// 服务器类型示例（UDP / TCP / DoT / DoH 四种格式，含自定义端口示例）
const SERVER_EXAMPLES = [
  { value: '8.8.8.8', label: 'Google UDP' },
  { value: 'tcp://8.8.8.8', label: 'Google TCP' },
  { value: 'dot://8.8.8.8', label: 'Google DoT' },
  { value: 'https://dns.google/resolve', label: 'Google DoH' },
  { value: '1.1.1.1', label: 'Cloudflare UDP' },
  { value: 'dot://1.1.1.1', label: 'Cloudflare DoT' },
  { value: 'tcp://8.8.8.8:5353', label: 'TCP 自定义端口' },
  { value: '223.5.5.5', label: 'AliDNS UDP' },
]

/**
 * 校验 IPv4 地址格式
 */
function isValidIpv4(host: string): boolean {
  const parts = host.split('.')
  if (parts.length !== 4)
    return false
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part))
      return false
    const num = Number.parseInt(part, 10)
    if (num > 255)
      return false
    if (part.length > 1 && part.startsWith('0'))
      return false
    return true
  })
}

/**
 * 校验单个 IPv6 组（1-4 位十六进制）
 */
function isValidIpv6Group(part: string): boolean {
  return part.length > 0 && part.length <= 4 && /^[0-9a-f]+$/i.test(part)
}

/**
 * 校验 IPv6 地址格式（支持 :: 零压缩和嵌入的 IPv4）
 */
function isValidIpv6(host: string): boolean {
  // 移除方括号
  const cleaned = host.replace(/^\[|\]$/g, '')
  if (!cleaned.includes(':'))
    return false

  // 处理嵌入的 IPv4（如 ::ffff:192.168.1.1）
  let normalized = cleaned
  const lastColon = cleaned.lastIndexOf(':')
  const tail = cleaned.slice(lastColon + 1)
  if (tail.includes('.')) {
    if (!isValidIpv4(tail))
      return false
    // 将 IPv4 转换为两个 16 位组
    const [a, b, c, d] = tail.split('.').map(Number)
    const hex1 = ((a << 8) | b).toString(16)
    const hex2 = ((c << 8) | d).toString(16)
    normalized = `${cleaned.slice(0, lastColon + 1)}${hex1}:${hex2}`
  }

  // 处理零压缩 ::
  if (normalized.includes('::')) {
    // 只允许一个 ::
    if (normalized.indexOf('::') !== normalized.lastIndexOf('::'))
      return false
    const [before, after] = normalized.split('::')
    const beforeParts = before ? before.split(':') : []
    const afterParts = after ? after.split(':') : []
    const allParts = [...beforeParts, ...afterParts]
    // :: 代表至少一个 0 组，所以总组数 < 8
    if (allParts.length >= 8)
      return false
    return allParts.every(isValidIpv6Group)
  }

  // 无零压缩，必须 8 组
  const parts = normalized.split(':')
  return parts.length === 8 && parts.every(isValidIpv6Group)
}

/**
 * 校验是否为有效 IP 地址（IPv4 或 IPv6）
 */
function isValidIp(host: string): boolean {
  return isValidIpv4(host) || isValidIpv6(host)
}

/**
 * 从地址部分解析 host 和 port
 * - IPv6 带方括号：[::1]:53 或 [::1]
 * - IPv6 无方括号：多个冒号视为纯 IPv6 地址（无端口）
 * - IPv4/hostname：host:port 或 host
 * @returns null 表示格式根本性错误；否则返回 { host, portStr? }
 */
function parseHostPort(addressPart: string): { host: string, portStr?: string } | null {
  if (addressPart.startsWith('[')) {
    // IPv6：[::1]:53 或 [::1]
    const bracketEnd = addressPart.indexOf(']')
    if (bracketEnd === -1)
      return null
    const host = addressPart.slice(1, bracketEnd)
    const after = addressPart.slice(bracketEnd + 1)
    if (after === '')
      return { host }
    if (after.startsWith(':'))
      return { host, portStr: after.slice(1) }
    return null // ] 后只能是 :port
  }

  // 计算冒号数量区分 IPv6 与 host:port
  const colonCount = (addressPart.match(/:/g) ?? []).length
  if (colonCount > 1) {
    // 多个冒号 = 无方括号的 IPv6 地址（无端口）
    return { host: addressPart }
  }

  if (colonCount === 1) {
    // 单冒号 = IPv4:port 或 hostname:port
    const lastColon = addressPart.lastIndexOf(':')
    const candidate = addressPart.slice(lastColon + 1)
    if (/^\d+$/.test(candidate)) {
      return { host: addressPart.slice(0, lastColon), portStr: candidate }
    }
    return { host: addressPart }
  }

  // 无冒号 = 纯 host
  return { host: addressPart }
}

/**
 * 校验 DNS 服务器地址格式
 * @returns true 表示合法，返回字符串为错误信息
 */
function validateDnsServer(value: string): true | string {
  if (!value)
    return true // 空值合法（使用系统默认）

  const trimmed = value.trim()

  // DoH：HTTP(S) URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed)
      if (!url.hostname)
        return 'DoH 地址缺少主机名'
      return true
    }
    catch {
      return 'DoH 地址格式错误，请输入完整的 URL'
    }
  }

  // 协议前缀
  const prefixMatch = trimmed.match(/^(udp|tcp|dot|tls):\/\//)
  let protocol = 'udp'
  let addressPart = trimmed
  if (prefixMatch) {
    protocol = prefixMatch[1] === 'tls' ? 'dot' : prefixMatch[1]
    addressPart = trimmed.slice(prefixMatch[0].length)
  }

  if (!addressPart) {
    return `地址错误：${protocol}:// 后缺少主机地址`
  }

  // 解析 host:port
  const parsed = parseHostPort(addressPart)
  if (!parsed) {
    return '地址格式错误：IPv6 地址缺少 ] 或 ] 后字符非法'
  }
  const { host, portStr } = parsed

  if (!host)
    return '地址错误：缺少主机'

  // UDP / TCP 协议要求有效的 IP 地址（dns.Resolver.setServers 和 TCP 直连都要求 IP）
  if ((protocol === 'udp' || protocol === 'tcp') && !isValidIp(host)) {
    return `${protocol.toUpperCase()} 协议要求有效的 IP 地址（IPv4 如 8.8.8.8，IPv6 如 [2001:db8::1]），当前值：${host}`
  }

  // 校验端口
  if (portStr !== undefined) {
    const port = Number.parseInt(portStr, 10)
    if (Number.isNaN(port) || port < 1 || port > 65535) {
      return `端口错误：${portStr} 不是有效端口（1-65535）`
    }
  }

  return true
}

/**
 * 检测 DNS 服务器地址的协议类型（用于格式正确时的视觉反馈）
 */
function detectProtocol(value: string): string | null {
  if (!value)
    return null
  const trimmed = value.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://'))
    return 'DoH'
  const match = trimmed.match(/^(udp|tcp|dot|tls):\/\//)
  if (match) {
    return match[1] === 'tls' ? 'DoT' : match[1].toUpperCase()
  }
  return 'UDP'
}

/**
 * 解析地址中的端口（用于格式正确时展示）
 */
function detectPort(value: string): number | null {
  if (!value)
    return null
  const trimmed = value.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed)
      return url.port ? Number.parseInt(url.port, 10) : null
    }
    catch {
      return null
    }
  }
  const prefixMatch = trimmed.match(/^(udp|tcp|dot|tls):\/\//)
  let addressPart = trimmed
  let protocol = 'udp'
  if (prefixMatch) {
    protocol = prefixMatch[1] === 'tls' ? 'dot' : prefixMatch[1]
    addressPart = trimmed.slice(prefixMatch[0].length)
  }
  const parsed = parseHostPort(addressPart)
  if (!parsed)
    return null
  if (parsed.portStr !== undefined) {
    const port = Number.parseInt(parsed.portStr, 10)
    if (!Number.isNaN(port) && port > 0 && port <= 65535)
      return port
  }
  return protocol === 'dot' ? 853 : 53
}

export function NsCheckCard() {
  const { setting, fetchNsCheckSetting, updateNsCheckSetting, testNsCheck } = useNsCheckSettingStore()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NsCheckFormValues>({
    defaultValues: {
      server: '',
    },
  })

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<NsCheckTestResult | null>(null)
  const [testDomain, setTestDomain] = useState('example.com')

  const serverValue = watch('server')
  const isValidFormat = !errors.server
  const detectedProtocol = serverValue ? detectProtocol(serverValue) : null
  const detectedPort = serverValue ? detectPort(serverValue) : null

  useEffect(() => {
    fetchNsCheckSetting()
  }, [fetchNsCheckSetting])

  useEffect(() => {
    if (setting) {
      reset({
        server: setting.server,
      })
    }
  }, [setting, reset])

  const onSubmit = async (data: NsCheckFormValues) => {
    try {
      const payload: UpdateNsCheckSettingInput = {
        server: data.server,
      }
      await updateNsCheckSetting(payload)
      toast.add({ title: 'NS 检查配置已保存', type: 'success' })
    }
    catch (error: any) {
      toast.add({ title: error.message || '保存 NS 检查配置失败', type: 'error' })
    }
  }

  const handleTest = async () => {
    if (!testDomain.trim()) {
      toast.add({ title: '请输入测试域名', type: 'error' })
      return
    }
    if (serverValue && !isValidFormat) {
      toast.add({ title: '服务器地址格式错误，请先修正', type: 'error' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testNsCheck({
        server: serverValue,
        domain: testDomain.trim(),
      })
      setTestResult(result)
      if (result.success) {
        toast.add({ title: `查询成功，找到 ${result.records.length} 条 NS 记录`, type: 'success' })
      }
      else {
        toast.add({ title: result.error || '查询失败', type: 'error' })
      }
    }
    catch (error: any) {
      toast.add({ title: error.message || '测试失败', type: 'error' })
    }
    finally {
      setTesting(false)
    }
  }

  const configured = setting?.configured ?? false

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>域名 NS 检查服务器</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${configured ? 'bg-status-success-bg text-status-success' : 'bg-status-warning-bg text-status-warning'}`}>
            {configured ? '已配置' : '未配置'}
          </span>
        </CardTitle>
        <CardDescription>
          用于域名 NS 记录查询的 DNS 解析服务器地址。支持四种格式：UDP（裸 IP，如 8.8.8.8）、TCP（如 tcp://8.8.8.8）、DoT（如 dot://8.8.8.8）、DoH（如 https://dns.google/resolve）。支持自定义端口（如 tcp://8.8.8.8:5353）。留空表示使用系统默认。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ns-check-server">DNS 解析服务器地址</Label>
            <Input
              id="ns-check-server"
              {...register('server', {
                maxLength: { value: 255, message: '最多 255 个字符' },
                validate: validateDnsServer,
              })}
              placeholder="8.8.8.8 | tcp://8.8.8.8 | dot://8.8.8.8 | https://dns.google/resolve"
            />
            {errors.server
              ? (
                  <p className="text-xs text-status-error flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.server.message}
                  </p>
                )
              : serverValue && detectedProtocol
                ? (
                    <p className="text-xs text-status-success flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>
                        格式正确 · 协议
                        {' '}
                        <code className="font-mono">{detectedProtocol}</code>
                        {detectedPort && (
                          <>
                            {' '}
                            · 端口
                            {' '}
                            <code className="font-mono">{detectedPort}</code>
                          </>
                        )}
                      </span>
                    </p>
                  )
                : (
                    <p className="text-xs text-muted-foreground">
                      留空使用系统默认 DNS。支持 UDP / TCP / DoT / DoH，可附加自定义端口。
                    </p>
                  )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">类型举例（点击填充）</Label>
            <div className="flex flex-wrap gap-2">
              {SERVER_EXAMPLES.map(example => (
                <Button
                  key={example.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setValue('server', example.value)}
                  className="gap-2"
                >
                  <code className="text-xs">{example.value}</code>
                  <span className="text-xs text-muted-foreground">{example.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* 手动检测 */}
          <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
            <div className="text-sm font-medium">手动检测</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Input
                  value={testDomain}
                  onChange={e => setTestDomain(e.target.value)}
                  placeholder="测试域名，如 example.com"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleTest()
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleTest}
                disabled={testing || (!!serverValue && !isValidFormat)}
                className="gap-2"
              >
                {testing
                  ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {' '}
                        检测中...
                      </>
                    )
                  : '测试连接'}
              </Button>
            </div>

            {serverValue && !isValidFormat && (
              <p className="text-xs text-status-warning">请先修正地址格式后再测试</p>
            )}

            {testResult && (
              <div className={`rounded-md p-3 text-sm ${testResult.success ? 'bg-status-success-bg text-status-success' : 'bg-status-error-bg text-status-error'}`}>
                <div className="flex items-start gap-2">
                  {testResult.success
                    ? (<CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />)
                    : (<AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      {testResult.success
                        ? `查询成功 · ${testResult.records.length} 条 NS 记录 · 耗时 ${testResult.durationMs}ms`
                        : `查询失败 · 耗时 ${testResult.durationMs}ms`}
                    </div>
                    {testResult.success
                      ? (
                          <div className="mt-1 text-xs space-y-0.5 break-all">
                            {testResult.records.map(record => (
                              <div key={record}>
                                ·
                                {record}
                              </div>
                            ))}
                          </div>
                        )
                      : (
                          <div className="mt-1 text-xs break-all">{testResult.error}</div>
                        )}
                    <div className="mt-1 text-xs opacity-70">
                      服务器:
                      {' '}
                      {testResult.server}
                      {' '}
                      · 域名:
                      {' '}
                      {testResult.domain}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存配置'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export type { NsCheckSetting }
