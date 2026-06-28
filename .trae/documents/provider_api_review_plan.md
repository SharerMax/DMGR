# 服务商 API 文档调研与实现校验计划

## 一、调研结论

### 1.1 阿里云 (Aliyun)

**官方 API：** POP API (OpenAPI)

- API 调用规范：RPC 风格，通过 HTTP GET/POST 发送 `Action` 参数
- DNS 产品核心 API（`Version: 2015-01-09`）：
  - `DescribeDomainRecords` - 获取解析记录列表
  - `AddDomainRecord` - 新增解析记录
  - `UpdateDomainRecord` - 更新解析记录
  - `DeleteDomainRecord` - 删除解析记录
  - `DescribeDomains` - 获取域名列表
- 签名算法：`SignatureMethod=HMAC-SHA1`，`SignatureVersion=1.0`
- 必填参数：`AccessKeyId`, `Signature`, `SignatureNonce`, `Timestamp`
- 请求体响应格式：JSON

**官方 SDK：** `@alicloud/pop-core`（Node.js，v1.8.0）

- 自动处理签名、时间戳、随机数
- 使用方式：
  ```js
  const Core = require('@alicloud/pop-core');
  const client = new Core({
    accessKeyId: 'xxx',
    accessKeySecret: 'xxx',
    endpoint: 'https://alidns.aliyuncs.com',
    apiVersion: '2015-04-01',
  });
  client.request('DescribeDomainRecords', { DomainName: 'example.com' });
  ```

**当前实现问题：**
- `apiClient.ts` 中 `generateSignature` 返回空字符串（未实现）
- `endpoint` 默认值缺失，请求 URL 未设置 `alidns.aliyuncs.com`
- API Version 应该是 `2015-04-01`（DNS 产品）而非 `2015-01-09`

---

### 1.2 腾讯云 (Tencent Cloud / DNSPod)

**官方 API：** 云 API 3.0 (TC3-HMAC-SHA256)

- DNS 产品（`dnspod`，`Version: 2021-03-23`）：
  - `DescribeRecordList` - 获取解析记录
  - `CreateRecord` - 新增记录
  - `ModifyRecord` - 更新记录
  - `DeleteRecord` - 删除记录
  - `DescribeDomainList` - 获取域名列表
  - `DescribeDomain` - 获取域名详情
- 域名续期 API 属于 `domain` 产品（独立 SDK 包）
- 请求 Host：`dnspod.tencentcloudapi.com` / `domain.tencentcloudapi.com`
- 签名算法：**TC3-HMAC-SHA256**（包含 CanonicalRequest、StringToSign 两重 SHA256）
- Common Params：`X-TC-Action`, `X-TC-Timestamp`, `X-TC-Version`, `X-TC-Region`, `Authorization`
- 响应格式：`{ Response: { RequestId, ...data, Error?: { Code, Message } } }`

**官方 SDK：** `tencentcloud-sdk-nodejs-dnspod` + `tencentcloud-sdk-nodejs-domain`

- 使用方式：
  ```js
  const { dnspod } = require('tencentcloud-sdk-nodejs-dnspod');
  const client = new dnspod.v20210323.Client({
    credential: { secretId, secretKey },
    region: '',
    profile: { httpProfile: { endpoint: 'dnspod.tencentcloudapi.com' } },
  });
  client.DescribeRecordList({ Domain: 'example.com' });
  ```

**当前实现问题：**
- `apiClient.ts` 中 `generateSignature` 返回空字符串（签名逻辑完全缺失）
- `RecordLine` 参数：海外版传 `Default`，国内版传 `默认`；当前仅传中文，可能导致海外用户失败
- 域名续期接口参数与腾讯云 `domain` 产品实际 API 不一致

---

### 1.3 Cloudflare

**官方 API：** RESTful v4 API（`https://api.cloudflare.com/client/v4`）

- 认证：`Authorization: Bearer <API_TOKEN>`
- Zone 管理：`GET /zones`, `GET /zones/:id`
- DNS 记录管理：`GET|POST|PUT|DELETE /zones/:zone_id/dns_records[/:id]`

**官方 SDK：** `cloudflare`（TypeScript，由 Cloudflare 官方维护）

```js
import Cloudflare from 'cloudflare';
const cf = new Cloudflare({ apiToken: 'xxx' });
const zones = await cf.zones.list();
const records = await cf.dnsRecords.list({ zoneId: 'xxx' });
```

**当前实现状态：** 目前手写 fetch 调用，API 端点和 Bearer 鉴权是正确的，但没有使用官方 SDK 提供的类型安全。

---

### 1.4 DNSPod（Legacy API）

**官方 API：** 传统 `dnsapi.cn` API（已逐步被 TC3 云 API 3.0 替代，但仍可用）

- 认证：表单参数 `login_token=ID,Token`
- 请求方法：仅支持 POST（`Content-Type: application/x-www-form-urlencoded`）
- User-Agent 必须设置，否则会被视为 API 滥用
- 响应格式：`{ status: { code, message, created_at }, ... }`
- 核心 API：`Domain.List`, `Record.List`, `Record.Create`, `Record.Modify`, `Record.Remove`

**官方 SDK：** 官方推荐使用新版云 API（即 `tencentcloud-sdk-nodejs-dnspod`），传统 dnsapi.cn 仅提供文档，无官方 SDK 包

**当前实现状态：** 与文档规范基本一致，但参数命名需核对（如 `sub_domain`, `record_type` 等）

---

### 1.5 Namecheap

**官方 API：** XML API（`https://api.namecheap.com/xml.response`）

- 认证参数：`ApiUser`, `ApiKey`, `UserName`, `ClientIp`, `Command`
- **必须设置 IP 白名单**（否则返回 401）
- **签名算法：HMAC-SHA1**（签名字符串格式：`username|api_key|timestamp`）
- 请求方法：GET（文档推荐）或 POST
- 响应格式：XML
- 核心 API：
  - 域名列表：`namecheap.domains.getList`
  - 域名信息：`namecheap.domains.getInfo`
  - 获取 DNS hosts：`namecheap.domains.dns.getHosts`
  - 设置 DNS hosts（全量覆盖）：`namecheap.domains.dns.setHosts`，参数 `HostName{i}`, `RecordType{i}`, `Address{i}`, `TTL{i}`, `MXPref{i}`
  - 续期：`namecheap.domains.renew`，参数 `DomainName`, `Years`

**官方 SDK：** 无官方 Node.js SDK，社区有 `namecheap-python`（Python）及 `n8n-nodes-namecheap`

**当前实现问题：**
- `apiClient.ts` 中缺少 **HMAC-SHA1 签名**及 `Timestamp` 参数
- 缺少对 XML 响应的结构化解析（当前仅简单解析 `_attributes`）
- `ClientIp` 是必填项，当前依赖用户配置，未在运行时动态获取

---

## 二、执行步骤

### 步骤 1：安装官方 SDK 依赖包
在 `packages/server/package.json` 的 `dependencies` 中添加：
- `@alicloud/pop-core`（阿里云）
- `tencentcloud-sdk-nodejs-dnspod`（腾讯云 DNS）
- `tencentcloud-sdk-nodejs-domain`（腾讯云域名续期）
- `cloudflare`（Cloudflare 官方 TS SDK）

并在 root `package.json` 或 catalog 中维护版本。

### 步骤 2：重写阿里云 `apiClient.ts`
- 引入 `@alicloud/pop-core`，删除手动构造签名逻辑
- 修正 endpoint 为 `https://alidns.aliyuncs.com`，API Version 为 `2015-04-01`
- Provider/Syncer/Renewer 保持接口调用不变，仅 `apiClient` 内部改为调用 SDK

### 步骤 3：重写腾讯云 `apiClient.ts`
- 引入 `tencentcloud-sdk-nodejs-dnspod` 和 `tencentcloud-sdk-nodejs-domain`
- 删除手动 TC3 签名代码，改为使用官方 Client
- `RecordLine` 参数根据 `region` 区分传 `Default`（海外）或 `默认`（国内）

### 步骤 4：重写 Cloudflare `apiClient.ts`
- 引入 `cloudflare` SDK，使用 `zones.list()`, `dnsRecords.list()`, `dnsRecords.create()`, `dnsRecords.update()`, `dnsRecords.delete()` 方法
- 统一错误处理，直接使用 SDK 返回的原生 TypeScript 类型

### 步骤 5：增强 DNSPod `apiClient.ts`
- 保留传统 API 调用，确保 User-Agent 符合规范（`DMGR/1.0 (support@example.com)`）
- 参数名、响应字段对照文档统一
- **（可选）** 提供迁移到 TC3 云 API 的选项（即复用腾讯云 SDK）

### 步骤 6：重写 Namecheap `apiClient.ts`
- 使用 Node.js 内置 `crypto` 实现 **HMAC-SHA1 签名**，添加 `Timestamp` 参数
- 使用 `fast-xml-parser`（如当前项目无 XML 解析器，需引入）替换手写 XML 解析
- 支持运行时 `ClientIp` 的自动检测（作为 fallback，用户配置优先）
- 对照官方文档校验 `setHosts` 参数结构

### 步骤 7：类型检查与 lint
- 执行 `pnpm typecheck`
- 执行 `pnpm lint`
- 修复所有 TS 错误和 eslint 警告

---

## 三、影响范围

- **修改文件：**
  - `packages/server/src/providers/aliyun/apiClient.ts`
  - `packages/server/src/providers/tencent/apiClient.ts`
  - `packages/server/src/providers/cloudflare/apiClient.ts`
  - `packages/server/src/providers/dnspod/apiClient.ts`
  - `packages/server/src/providers/namecheap/apiClient.ts`
  - `packages/server/package.json`（新增依赖）

- **保持不变：**
  - `base.ts`, `config.ts`, `index.ts`（抽象层 & 配置）
  - 各 provider 的 `provider.ts`, `syncer.ts`, `renewer.ts` 仅调整调用接口签名

---

## 四、风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| 官方 SDK 体积较大（`tencentcloud-sdk-nodejs-*` 每个包 ~1MB 编译产物） | 影响部署包大小 | 使用按需加载（ESM `import()`），仅在 provider 被创建时才 import SDK |
| 官方 SDK 可能没有 TypeScript 类型（`@alicloud/pop-core` 类型较弱） | 可能需要手动声明 `any` 或 `@ts-ignore` | 用 `declare module` 补一个最小 `d.ts`，或用 `as any` 做类型穿透 |
| Namecheap IP 白名单限制 | 部署后若 IP 变更，API 会失败 | 在 provider 初始化阶段尝试调用 `getList` 做健康检查，错误中明确提示 "请将当前 IP 添加到 Namecheap 白名单" |
| Cloudflare SDK 新版本可能有 breaking change | API 结构变化 | 固定稳定版本（`4.x`），并在 package.json 锁定 `^` 范围 |
| 阿里云 SDK 与现有 ESM `type: module` 不兼容 | 引入时报错 | 用 `createRequire` 做 CommonJS 桥接，或寻找 ESM 版本 |

---

## 五、验收标准

1. `pnpm typecheck` 通过，无 TS 错误
2. `pnpm lint` 通过，无 eslint 警告
3. 每个 `apiClient.ts` 都使用对应服务商的官方 SDK（除 DNSPod/Namecheap 外，DNSPod 可选迁移）
4. 手动签名逻辑（空实现）已被移除
5. 所有 provider 接口调用保持业务层稳定（provider.ts 中使用的 API 方法签名不变）
