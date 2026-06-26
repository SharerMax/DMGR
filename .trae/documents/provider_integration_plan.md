# 域名三方服务打通 & Renew 实现下沉计划

## 问题分析

### 问题 1：域名/DNS 操作未与三方服务打通

当前域名和 DNS 记录的 CRUD 操作**只操作本地数据库**，没有同步到第三方 DNS 服务商：

| 操作 | 现状 | 应改为 |
|------|------|--------|
| 创建域名 | 只写本地 DB | 写本地 DB + 调用三方 API 创建/关联 |
| 更新域名 | 只写本地 DB | 写本地 DB + 调用三方 API 更新 |
| 删除域名 | 只删本地 DB | 删本地 DB + 调用三方 API 删除 |
| DNS 记录 CRUD | 只操作本地 DB | 操作本地 DB + 同步三方 DNS |

### 问题 2：Renew 实现不在服务商层

当前 renew 逻辑散落在 `services/autoRenew.ts` 中：
- `createAliyunRenewalExecutor()` — 阿里云续期
- `createTencentRenewalExecutor()` — 腾讯云续期
- `getRenewalExecutor()` — 工厂函数

按分层架构规范，**renew 应该由 providers/ 适配层提供**（和 DNSProvider、DomainSyncer 一样），service 层只做业务编排。

## 重构目标

1. 新增 `DomainRenewer` 抽象基类，renew 实现下沉到 providers/ 层
2. 域名 CRUD 和 DNS 记录 CRUD 操作打通三方服务（service 层协调本地 DB + 三方 API）
3. 保持 `autoRenew.ts` 作为调度服务，只做业务编排，不包含具体续期逻辑

## 新增文件

### providers 层

| 文件 | 说明 |
|------|------|
| `providers/aliyun/renewer.ts` | 阿里云域名续期器（AliyunDomainRenewer） |

### 调整的基类

| 文件 | 变更 |
|------|------|
| `providers/base.ts` | 新增 `DomainRenewer` 抽象基类；`DNSProviderFactory` 新增 renewer 注册/创建方法 |

## 修改文件

### services 层

| 文件 | 变更 |
|------|------|
| `services/autoRenew.ts` | 移除 `createAliyunRenewalExecutor()` / `createTencentRenewalExecutor()` / `getRenewalExecutor()`；改为从 providers 层获取 renewer |
| `services/domainService.ts` | 域名创建/更新/删除时，调用 providers 层同步三方 |
| `services/dnsRecordService.ts` | DNS 记录 CRUD 时，调用 providers 层同步三方 DNS |
| `services/providerService.ts` | 调整为使用 DNSProviderFactory 统一创建各类实例 |

### providers 层

| 文件 | 变更 |
|------|------|
| `providers/aliyun/index.ts` | 导出 AliyunDomainRenewer，注册到工厂 |
| `providers/index.ts` | 统一导出 DomainRenewer 相关类型 |

## 详细设计

### 1. DomainRenewer 抽象基类

在 `providers/base.ts` 中新增：

```typescript
export interface RenewalResult {
  success: boolean
  error?: string
  newExpiryDate?: string
}

export abstract class DomainRenewer {
  abstract readonly id: string
  abstract readonly name: string

  protected apiKey?: string
  protected apiSecret?: string

  constructor(config: { apiKey?: string, apiSecret?: string }) { ... }

  abstract validateConfig(): boolean

  /**
   * 执行域名续期
   * @param domain 域名
   * @param years 续期年数（默认1年）
   */
  abstract renewDomain(domain: string, years?: number): Promise<RenewalResult>
}
```

DNSProviderFactory 新增：
- `registerRenewer(id, renewer)`
- `createRenewer(id, config)`

### 2. 阿里云续期实现

新建 `providers/aliyun/renewer.ts`：
- 实现 `AliyunDomainRenewer` 继承 `DomainRenewer`
- 注册到 `DNSProviderFactory.registerRenewer('aliyun', AliyunDomainRenewer)`
- 调用阿里云域名 API 执行续期（当前 mock 实现，后续接真实 API）

### 3. autoRenew.ts 简化

移除：
- `RenewalExecutor` 接口
- `getRenewalExecutor()` 工厂函数
- `createAliyunRenewalExecutor()` / `createTencentRenewalExecutor()`

改为：
- 使用 `DNSProviderFactory.createRenewer(providerType, config)` 获取续期器
- 调用 `renewer.renewDomain(domainName)` 执行续期

### 4. 域名操作打通三方

在 `domainService.ts` 中：

| 操作 | 流程 |
|------|------|
| 创建域名 | 写本地 DB → 调用三方创建/关联 → 同步最新信息 |
| 更新域名 | 写本地 DB → 调用三方更新（如 DNS 设置、自动续期开关） |
| 删除域名 | 调用三方删除/解除关联 → 删本地 DB |

**注意**：三方调用失败时的策略 —— 记录日志 + 返回部分成功标记，不回滚本地操作（避免数据不一致更复杂）。

### 5. DNS 记录操作打通三方

在 `dnsRecordService.ts` 中：

| 操作 | 流程 |
|------|------|
| 创建 DNS 记录 | 调用三方创建 → 成功后写本地 DB |
| 更新 DNS 记录 | 调用三方更新 → 成功后更新本地 DB |
| 删除 DNS 记录 | 调用三方删除 → 成功后删本地 DB |

**注意**：DNS 记录的三方操作为主，本地 DB 作为缓存/镜像。

### 6. providerService 调整

`providerService.ts` 中当前直接用 `switch/case` 创建 syncer，改为使用 `DNSProviderFactory.createSyncer()`。

## 实施步骤

### 阶段一：DomainRenewer 基类 + 阿里云实现
1. 在 `providers/base.ts` 新增 `DomainRenewer` 抽象基类和工厂方法
2. 创建 `providers/aliyun/renewer.ts` 实现阿里云续期
3. 更新 `providers/aliyun/index.ts` 导出并注册

### 阶段二：autoRenew 改造
1. 移除 autoRenew.ts 中的 renew executor 实现
2. 改为使用 DNSProviderFactory 创建 renewer
3. 保持调度逻辑和日志记录不变

### 阶段三：DNS 记录操作打通三方
1. dnsRecordService 创建记录 → 先调三方 API，成功后写本地
2. dnsRecordService 更新记录 → 先调三方 API，成功后更新本地
3. dnsRecordService 删除记录 → 先调三方 API，成功后删本地

### 阶段四：域名操作打通三方
1. domainService 创建域名 → 写本地 + 调三方
2. domainService 更新域名 → 写本地 + 调三方
3. domainService 删除域名 → 调三方 + 删本地

### 阶段五：验证
1. 运行 typecheck
2. 运行 lint
3. 确保接口行为不变

## 风险与权衡

| 风险 | 影响 | 应对 |
|------|------|------|
| 三方 API 调用失败导致数据不一致 | 中 | 先操作三方，成功后再写本地；失败时记录日志，不回滚 |
| 当前三方 API 都是 mock，无法验证真实行为 | 低 | 保持 mock 实现，接口签名正确即可，真实 API 后续接入 |
| 域名创建是否需要真的在三方注册 | 低 | 区分"添加已有域名"和"注册新域名"，当前只做关联/同步 |
| 删除域名时是否真删三方数据 | 高 | 只解除本地关联，不删除三方数据（避免误删） |

## 不涉及的范围

- 真实三方 API 接入（保持 mock 实现）
- 前端代码改动（后端接口契约不变）
- `providers/vps8/` 等其他服务商的 renew 实现（只做阿里云作为示例）
- 事务处理（三方 API 调用不支持事务，采用最终一致策略）
