# Domain Manager - 域名管理系统

## 项目概述

一个用于管理域名的 Web 应用程序，支持用户认证、域名管理、服务商管理、DNS记录管理、通知渠道管理和过期提醒功能。

## 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **路由**: React Router v6
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **HTTP 客户端**: Axios
- **日期处理**: date-fns
- **构建工具**: Vite 8

### 后端
- **运行时**: Node.js
- **框架**: Express
- **数据库**: SQLite + Prisma ORM
- **认证**: JWT (jsonwebtoken)
- **密码加密**: bcryptjs
- **数据验证**: Zod
- **开发工具**: tsx (TypeScript 执行)

### 开发工具
- **包管理器**: pnpm
- **Node.js**: >= v22.21
- **代码规范**: ESLint (@antfu/eslint-config v9)
- **React ESLint**: @eslint-react/eslint-plugin, eslint-plugin-react-refresh
- **类型检查**: TypeScript v6

## 目录结构

```
domain/
├── packages/
│   ├── server/                          # 后端项目
│   │   ├── prisma/
│   │   │   ├── dev.db                  # SQLite 数据库文件
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   └── index.ts           # Prisma Client 初始化
│   │   │   ├── prisma/
│   │   │   │   ├── schema.prisma           # Prisma 数据模型定义
│   │   │   │   ├── seed.ts                 # 数据库种子数据
│   │   │   │   ├── dev.db                  # SQLite 数据库文件
│   │   │   │   └── migrations/             # Prisma 迁移文件
│   │   │   ├── models/
│   │   │   │   ├── user.ts            # 用户模型
│   │   │   │   ├── domain.ts          # 域名模型
│   │   │   │   ├── provider.ts        # 服务商模型
│   │   │   │   ├── reminder.ts        # 提醒模型
│   │   │   │   ├── notificationChannel.ts # 通知渠道模型
│   │   │   │   └── dnsRecord.ts       # DNS记录模型
│   │   │   ├── routes/
│   │   │   ├── auth.ts            # 认证路由
│   │   │   ├── domains.ts         # 域名路由
│   │   │   ├── providers.ts       # 服务商路由
│   │   │   ├── notificationChannels.ts # 通知渠道路由
│   │   │   └── dnsRecords.ts      # DNS记录路由
│   │   ├── providers/            # DNS 提供商抽象实现
│   │   │   ├── base.ts           # 抽象基类
│   │   │   ├── providers.ts     # 内置服务商配置列表
│   │   │   ├── aliyun.ts         # 阿里云 DNS 实现
│   │   │   ├── aliyun-syncer.ts  # 阿里云域名同步器
│   │   │   └── index.ts          # 导出
│   │   └── index.ts               # 服务器入口
│   │   └── package.json
│   │
│   └── client/                         # 前端项目
│       ├── src/
│       │   ├── components/
│       │   │   └── ui/                # shadcn UI 组件
│       │   │       ├── button.tsx
│       │   │       ├── card.tsx
│       │   │       ├── dialog.tsx
│       │   │       ├── input.tsx
│       │   │       ├── label.tsx
│       │   │       ├── pagination.tsx # 分页组件
│       │   │       ├── select.tsx
│       │   │       ├── switch.tsx
│       │   │       ├── table.tsx      # 表格组件
│       │   │       └── textarea.tsx
│       │   ├── lib/
│       │   │   ├── api.ts             # API 客户端
│       │   │   └── utils.ts           # 工具函数
│       │   ├── pages/
│       │   │   ├── Login.tsx          # 登录/注册页
│       │   │   ├── Domains.tsx        # 域名管理页（含DNS记录）
│       │   │   ├── Providers.tsx      # 服务商管理页
│       │   │   ├── NotificationChannels.tsx # 通知渠道管理页
│       │   │   └── Profile.tsx        # 用户信息页
│       │   ├── stores/
│       │   │   ├── auth.ts           # 认证状态
│       │   │   ├── domains.ts         # 域名状态
│       │   │   ├── providers.ts      # 服务商状态
│       │   │   ├── notificationChannels.ts # 通知渠道状态
│       │   │   └── dnsRecords.ts      # DNS记录状态
│       │   ├── App.tsx               # 应用入口
│       │   ├── main.tsx              # React 入口
│       │   └── index.css             # 全局样式
│       └── package.json
│
├── package.json                        # 根 package.json
├── pnpm-workspace.yaml                # pnpm 工作区配置
├── eslint.config.js                   # ESLint 配置
├── tsconfig.json                      # TypeScript 配置
└── .gitignore
```

## 数据库表结构 (Prisma Schema)

### User (用户)
```prisma
model User {
  id                 Int                 @id @default(autoincrement())
  username           String              @unique
  password           String
  email              String?
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  domains            Domain[]
  providers          Provider[]
  notificationChannels NotificationChannel[]
}
```

### Provider (服务商)
```prisma
model Provider {
  id               Int      @id @default(autoincrement())
  type             String   // 服务商类型: aliyun, tencent, cloudflare, dnspod, namecheap, custom
  name             String   // 显示名称
  config           String   // JSON 格式的动态配置
  supportsAutoRenew Boolean @default(false)  // 是否支持自动续期
  userId           Int
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  domains          Domain[]

  @@index([userId])
}
```

### Domain (域名)
```prisma
model Domain {
  id           Int        @id @default(autoincrement())
  name         String
  providerId   Int?
  provider     Provider?  @relation(fields: [providerId], references: [id], onDelete: SetNull)
  userId       Int
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiryDate   DateTime
  autoRenew    Boolean    @default(false)
  renewalPrice Float?
  status       String     @default("active")
  notes        String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  reminders    Reminder[]
  dnsRecords   DNSRecord[]
}
```

### Reminder (提醒)
```prisma
model Reminder {
  id         Int       @id @default(autoincrement())
  domainId   Int
  domain     Domain    @relation(fields: [domainId], references: [id], onDelete: Cascade)
  daysBefore Int
  notified   Boolean   @default(false)
  notifyDate DateTime?
  createdAt  DateTime  @default(now())
}
```

### NotificationChannel (通知渠道)
```prisma
model NotificationChannel {
  id              Int      @id @default(autoincrement())
  userId          Int
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type            String   // email, sms, webhook
  name            String
  config          String   // JSON string for config
  defaultDays     Int      @default(90) // 默认提前天数
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### DNSRecord (DNS记录)
```prisma
model DNSRecord {
  id          Int      @id @default(autoincrement())
  domainId    Int
  domain      Domain   @relation(fields: [domainId], references: [id], onDelete: Cascade)
  type        String   // A, AAAA, CNAME, MX, TXT, NS, SRV, CAA, PTR, SOA
  name        String   // 主机名，如 www, @, mail
  value       String   // 记录值
  ttl         Int      @default(3600) // 生存时间（秒）
  priority    Int?     // MX记录的优先级
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## API 接口

### 认证接口

#### POST /api/auth/register
注册新用户
```json
请求体:
{
  "username": "string",
  "password": "string",
  "email": "string (可选)"
}

响应:
{
  "user": { "id": 1, "username": "...", "email": "..." },
  "token": "jwt-token"
}
```

#### POST /api/auth/login
用户登录
```json
请求体:
{
  "username": "string",
  "password": "string"
}

响应:
{
  "user": { "id": 1, "username": "...", "email": "..." },
  "token": "jwt-token"
}
```

#### GET /api/auth/me
获取当前用户信息
```
请求头: Authorization: Bearer <token>

响应:
{
  "id": 1,
  "username": "...",
  "email": "...",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### PUT /api/auth/profile
更新用户信息（邮箱）
```json
请求头: Authorization: Bearer <token>

请求体:
{
  "email": "new@example.com"  // 可为 null
}

响应:
{
  "id": 1,
  "username": "...",
  "email": "new@example.com"
}
```

#### PUT /api/auth/password
修改密码
```json
请求头: Authorization: Bearer <token>

请求体:
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}

响应:
{
  "message": "密码修改成功"
}
```

### 域名接口

#### GET /api/domains
获取当前用户的所有域名

#### GET /api/domains/expiring?days=30
获取指定天数内即将过期的域名

#### GET /api/domains/:id
获取单个域名详情

#### POST /api/domains
创建域名
```json
请求体:
{
  "name": "example.com",
  "providerId": 1,
  "expiryDate": "2025-12-31",
  "autoRenew": true,
  "renewalPrice": 59.00,
  "notes": "备注"
}
```

#### PUT /api/domains/:id
更新域名

#### DELETE /api/domains/:id
删除域名

#### POST /api/domains/:id/reminders
添加域名提醒
```json
请求体:
{
  "daysBefore": 7
}
```

### 服务商接口

#### GET /api/providers
获取当前用户的所有服务商

#### GET /api/providers/types
获取支持的服务商类型列表（无需认证）
```json
响应:
[
  {
    "id": "aliyun",
    "name": "阿里云",
    "description": "阿里云域名服务",
    "fields": [
      { "key": "accessKeyId", "label": "AccessKey ID", "type": "text", "required": true },
      { "key": "accessKeySecret", "label": "AccessKey Secret", "type": "password", "required": true }
    ],
    "supportsAutoRenew": true,
    "features": ["域名同步", "DNS管理", "自动续期"]
  }
]
```

#### GET /api/providers/:id
获取单个服务商详情

#### POST /api/providers
创建服务商
```json
请求体:
{
  "type": "aliyun",
  "name": "我的阿里云",
  "config": {
    "accessKeyId": "your-access-key-id",
    "accessKeySecret": "your-access-key-secret"
  },
  "supportsAutoRenew": true
}
```

#### PUT /api/providers/:id
更新服务商

#### DELETE /api/providers/:id
删除服务商

#### POST /api/providers/:id/sync
从服务商同步域名
```json
响应:
{
  "message": "同步成功",
  "syncedCount": 2,
  "domains": [...]
}
```

### 通知渠道接口

#### GET /api/notification-channels
获取当前用户的所有通知渠道

#### GET /api/notification-channels/:id
获取单个通知渠道详情

#### POST /api/notification-channels
创建通知渠道
```json
请求体:
{
  "type": "email",       // email, sms, webhook
  "name": "工作邮箱",
  "config": { "email": "work@example.com" },
  "defaultDays": 90,
  "isActive": true
}
```

#### PUT /api/notification-channels/:id
更新通知渠道

#### DELETE /api/notification-channels/:id
删除通知渠道

### DNS记录接口

#### GET /api/dns-records/domain/:domainId
获取指定域名的所有DNS记录

#### GET /api/dns-records/:id
获取单个DNS记录详情

#### POST /api/dns-records
创建DNS记录
```json
请求体:
{
  "domainId": 1,
  "type": "A",            // A, AAAA, CNAME, MX, TXT, NS, SRV, CAA, PTR, SOA
  "name": "www",
  "value": "192.168.1.1",
  "ttl": 3600,
  "priority": 10          // MX/SRV记录可选
}
```

#### PUT /api/dns-records/:id
更新DNS记录

#### DELETE /api/dns-records/:id
删除DNS记录

## 前端状态管理

### useAuthStore
```typescript
interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, email?: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  updateProfile: (email: string | null) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}
```

### useDomainStore
```typescript
interface DomainState {
  domains: Domain[]
  loading: boolean
  error: string | null
  fetchDomains: () => Promise<void>
  createDomain: (data: CreateDomainInput) => Promise<Domain>
  updateDomain: (id: number, data: Partial<CreateDomainInput>) => Promise<Domain>
  deleteDomain: (id: number) => Promise<void>
  addReminder: (domainId: number, daysBefore: number) => Promise<Reminder>
}
```

### useProviderStore
```typescript
interface ProviderField {
  key: string
  label: string
  type: 'text' | 'password' | 'url'
  required: boolean
  placeholder?: string
  description?: string
}

interface ProviderType {
  id: string
  name: string
  description?: string
  fields: ProviderField[]
  supportsAutoRenew: boolean
  features: string[]
}

interface Provider {
  id: number
  type: string
  name: string
  config: string // JSON 格式
  supportsAutoRenew: boolean
  userId: number
  createdAt: string
  updatedAt: string
}

interface ProviderState {
  providers: Provider[]
  providerTypes: ProviderType[]
  loading: boolean
  error: string | null
  fetchProviders: () => Promise<void>
  fetchProviderTypes: () => Promise<void>
  createProvider: (data: CreateProviderInput) => Promise<Provider>
  updateProvider: (id: number, data: Partial<CreateProviderInput>) => Promise<Provider>
  deleteProvider: (id: number) => Promise<void>
  syncDomains: (id: number) => Promise<{ syncedCount: number, domains: any[] }>
}

interface CreateProviderInput {
  type: string
  name: string
  config: Record<string, string>
  supportsAutoRenew?: boolean
}
```

### useNotificationChannelStore
```typescript
interface NotificationChannelState {
  channels: NotificationChannel[]
  loading: boolean
  error: string | null
  fetchChannels: () => Promise<void>
  createChannel: (data: CreateChannelInput) => Promise<NotificationChannel>
  updateChannel: (id: number, data: Partial<CreateChannelInput>) => Promise<NotificationChannel>
  deleteChannel: (id: number) => Promise<void>
}

interface CreateChannelInput {
  type: 'email' | 'sms' | 'webhook'
  name: string
  config: Record<string, unknown>
  defaultDays?: number
  isActive?: boolean
}
```

### useDNSRecordStore
```typescript
interface DNSRecordState {
  records: DNSRecord[]
  loading: boolean
  error: string | null
  fetchRecords: (domainId: number) => Promise<void>
  createRecord: (data: CreateDNSRecordInput) => Promise<DNSRecord>
  updateRecord: (id: number, data: Partial<CreateDNSRecordInput>) => Promise<DNSRecord>
  deleteRecord: (id: number) => Promise<void>
}

interface CreateDNSRecordInput {
  domainId: number
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV' | 'CAA' | 'PTR' | 'SOA'
  name: string
  value: string
  ttl?: number
  priority?: number | null
}
```

## 运行命令

```bash
# 安装依赖
pnpm install

# 数据库初始化
cd packages/server
pnpm prisma generate          # 生成 Prisma Client
pnpm prisma migrate dev        # 创建数据库表
pnpm prisma db seed           # 初始化种子数据

# 开发模式
pnpm dev:server               # 仅后端 (http://localhost:3001)
pnpm dev:client               # 仅前端 (http://localhost:3000)

# 构建
pnpm build

# 代码检查
pnpm lint
pnpm lint:fix                 # 自动修复

# 类型检查
cd packages/server && pnpm exec tsc --noEmit
cd packages/client && pnpm exec tsc --noEmit
```

## 环境变量

后端支持以下环境变量（可选）:
- `PORT`: 服务器端口，默认 3001
- `JWT_SECRET`: JWT 密钥，生产环境必须设置

## 重要约定

### 代码规范
- 使用 `@antfu/eslint-config v9` 配置
- React 组件使用 `.tsx` 扩展名
- TypeScript 严格模式
- Package.json 设置 `"type": "module"` 使用 ES Module
- 使用 `pnpm` 作为包管理器

### 数据库
- Prisma Schema: `packages/server/prisma/schema.prisma`
- 数据库文件: `packages/server/prisma/dev.db`
- 使用 Prisma Client 进行数据库操作

### API 认证
- 使用 JWT Token
- Token 通过 `Authorization: Bearer <token>` 头传递
- Token 有效期 7 天
- 保存在 localStorage 中

### 前端路由
- `/login` - 登录/注册页
- `/` - 域名管理页（需要认证）
- `/providers` - 服务商管理页（需要认证）
- `/notification-channels` - 通知渠道管理页（需要认证）
- `/profile` - 用户信息页（需要认证）

## 功能说明

### 域名管理
- 域名列表使用 Table 组件展示，支持分页（每页10条）
- 支持添加、编辑、删除域名
- 显示域名过期状态（已过期/即将过期/正常）
- 支持自动续期设置

### DNS记录管理
- 点击域名操作栏的设置图标打开 DNS 管理 Dialog
- Dialog 内包含 DNS 记录列表和添加表单
- 支持多种记录类型：A、AAAA、CNAME、MX、TXT、NS、SRV、CAA、PTR、SOA
- 支持设置TTL（默认3600秒）
- MX/SRV记录支持设置优先级
- 支持编辑和删除记录

### 通知渠道管理
- 支持三种通知渠道类型：邮件(email)、短信(sms)、Webhook
- 可设置默认提前提醒天数（默认90天）
- 支持启用/禁用渠道
- 配置信息以JSON格式存储

### 服务商管理
- 支持多种域名服务商：阿里云、腾讯云、Cloudflare、DNSPod、Namecheap、自定义
- 选择服务商类型后，根据类型动态显示所需配置字段
- 支持设置是否支持自动续期
- 支持一键同步域名（从服务商 API 获取）
- 配置信息以 JSON 格式存储

### 用户信息管理
- 查看用户名和注册时间
- 修改邮箱地址
- 修改密码（需验证当前密码）
- 入口：顶部导航栏用户名可点击

## 测试账号

种子数据包含以下测试账号:
- 用户名: `admin`
- 密码: `password123`

## DNS Provider 抽象

### 概述

项目提供了 DNS Provider 和 DomainSyncer 的抽象基类，支持后续扩展不同的 DNS 服务商实现。

### 核心接口

#### DNSProvider (DNS 记录管理)
```typescript
interface DNSRecordInput {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV' | 'CAA' | 'PTR' | 'SOA'
  name: string
  value: string
  ttl?: number
  priority?: number | null
  line?: string
}

interface DNSRecordOutput {
  id: string
  type: string
  name: string
  value: string
  ttl: number
  priority: number | null
  line?: string
  status: 'ENABLE' | 'DISABLE'
  createdAt: string
  updatedAt: string
}

abstract class DNSProvider {
  abstract readonly id: string
  abstract readonly name: string

  abstract validateConfig(): boolean
  abstract getDNSRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>>
  abstract addDNSRecord(domain: string, record: DNSRecordInput): Promise<DNSOperationResult<DNSRecordOutput>>
  abstract updateDNSRecord(domain: string, recordId: string, record: Partial<DNSRecordInput>): Promise<DNSOperationResult<DNSRecordOutput>>
  abstract deleteDNSRecord(domain: string, recordId: string): Promise<DNSOperationResult>
  abstract setDNSRecordStatus(domain: string, recordId: string, status: 'ENABLE' | 'DISABLE'): Promise<DNSOperationResult>
  abstract batchUpdateDNSRecords(domain: string, records: Array<{ id: string, data: Partial<DNSRecordInput> }>): Promise<DNSOperationResult>
}
```

#### DomainSyncer (域名同步)
```typescript
interface DomainInfo {
  name: string
  registrar?: string
  registrationDate?: string
  expirationDate: string
  status: string
  dnsServers?: string[]
}

interface SyncResult {
  success: boolean
  domains: DomainInfo[]
  errors?: string[]
}

abstract class DomainSyncer {
  abstract readonly id: string
  abstract readonly name: string

  abstract validateConfig(): boolean
  abstract getAccountInfo(): Promise<DNSOperationResult<any>>
  abstract listDomains(): Promise<DNSOperationResult<DomainInfo[]>>
  abstract getDomainInfo(domain: string): Promise<DNSOperationResult<DomainInfo>>
  abstract syncDomains(): Promise<SyncResult>
  abstract getDomainRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>>
  abstract syncDomainRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>>
}
```

### 已实现的提供商

#### 阿里云 (Aliyun)
- `AliyunDNSProvider` - DNS 记录管理
- `AliyunSyncer` - 域名同步

### 使用示例

```typescript
import { AliyunSyncer, DNSProviderFactory } from './providers'

// 创建同步器
const syncer = new AliyunSyncer({
  apiKey: 'your-access-key-id',
  apiSecret: 'your-access-key-secret',
})

// 同步域名
const result = await syncer.syncDomains()
```

### 添加新的 DNS 提供商

1. 继承 `DNSProvider` 或 `DomainSyncer` 抽象类
2. 实现所有抽象方法
3. 使用 `DNSProviderFactory.registerProvider()` 注册

```typescript
import { DNSProvider, DNSProviderFactory } from './providers'

class MyDNSProvider extends DNSProvider {
  readonly id = 'mydns'
  readonly name = '我的 DNS'

  // 实现所有抽象方法...
}

// 注册
DNSProviderFactory.registerProvider('mydns', MyDNSProvider)
```