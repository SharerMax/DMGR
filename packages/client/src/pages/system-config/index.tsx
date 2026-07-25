import { NsCheckCard } from './NsCheckCard'
import { SmtpCard } from './SmtpCard'

export default function SystemConfig() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">系统配置</h2>
        <p className="text-sm text-muted-foreground mt-1">配置全局系统参数，包括 SMTP 服务器和域名 NS 检查服务器。</p>
      </div>
      <div className="space-y-6">
        <SmtpCard />
        <NsCheckCard />
      </div>
    </div>
  )
}
