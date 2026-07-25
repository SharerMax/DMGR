/** 域名 NS 检查服务器配置（API 响应格式） */
export interface NsCheckSetting {
  /** DNS 解析服务器地址（IP 或 URL，如 8.8.8.8 或 https://dns.google/resolve） */
  server: string
  /** 是否已配置 */
  configured: boolean
}

/** 更新 NS 检查服务器配置输入 */
export interface UpdateNsCheckSettingInput {
  server?: string
}

/** NS 检查测试输入 */
export interface NsCheckTestInput {
  /** 待测试的服务器地址（为空时使用系统默认 DNS） */
  server?: string
  /** 测试查询的域名 */
  domain: string
}

/** NS 检查测试结果 */
export interface NsCheckTestResult {
  /** 是否成功 */
  success: boolean
  /** 测试使用的服务器地址 */
  server: string
  /** 测试的域名 */
  domain: string
  /** 查询到的 NS 记录列表 */
  records: string[]
  /** 失败时的错误信息 */
  error?: string
  /** 查询耗时（毫秒） */
  durationMs: number
}
