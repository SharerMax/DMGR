---
name: "domain-manager-backend"
description: "Backend development for Domain Manager Express server. Invoke when working on API routes, Prisma models, DNS providers, or database operations in packages/server."
---

# Domain Manager Backend

Backend development skill for the Domain Manager Express application.

## Project Context

- **Runtime**: Node.js (ES Module)
- **Framework**: Express
- **Database**: SQLite + Prisma ORM
- **Authentication**: JWT
- **Validation**: Zod
- **Dev Tool**: tsx for TypeScript execution

## Key Paths

```
packages/server/
├── prisma/
│   └── dev.db           # SQLite database file
├── src/
│   ├── index.ts         # Server entry point
│   ├── db/
│   │   └── index.ts     # Prisma client initialization
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   ├── seed.ts           # Seed data
│   │   ├── generated/        # Generated Prisma client
│   │   └── migrations/       # Migration history
│   ├── models/
│   │   ├── user.ts
│   │   ├── domain.ts
│   │   ├── provider.ts
│   │   ├── reminder.ts
│   │   ├── notificationChannel.ts
│   │   └── dnsRecord.ts
│   ├── routes/
│   │   ├── auth.ts      # Authentication routes
│   │   ├── domains.ts   # Domain CRUD
│   │   ├── providers.ts # Provider management + sync
│   │   ├── notificationChannels.ts
│   │   └── dnsRecords.ts
│   └── providers/
│       ├── base.ts      # Abstract DNS provider
│       ├── providers.ts # Built-in provider configs
│       ├── aliyun.ts    # Aliyun implementation
│       ├── aliyun-syncer.ts
│       └── index.ts
├── package.json
├── prisma.config.ts     # Prisma configuration
└── tsconfig.json
```

## Database Schema

### Core Models

- **User**: id, username, password, email
- **Domain**: id, name, providerId, userId, expiryDate, autoRenew, renewalPrice, status, notes
- **Provider**: id, type, name, config (JSON), supportsAutoRenew, userId
- **Reminder**: id, domainId, daysBefore, notified, notifyDate
- **NotificationChannel**: id, userId, type, name, config (JSON), defaultDays, isActive
- **DNSRecord**: id, domainId, type, name, value, ttl, priority

## API Routes Pattern

All routes use:
- JWT authentication via middleware
- Zod for request validation
- Error handling with appropriate HTTP status codes

### Example Route Structure

```typescript
import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth'
import { prisma } from '@/db'

const router = Router()

// GET /api/resource - List all
router.get('/', authenticate, async (req, res) => {
  const items = await prisma.resource.findMany({
    where: { userId: req.userId }
  })
  res.json(items)
})

// POST /api/resource - Create
router.post('/', authenticate, async (req, res) => {
  const data = someSchema.parse(req.body)
  const item = await prisma.resource.create({
    data: { ...data, userId: req.userId }
  })
  res.json(item)
})

export default router
```

## Provider System

### Provider Types

Defined in `src/providers/providers.ts`:
- aliyun: Aliyun DNS
- tencent: Tencent Cloud
- cloudflare: Cloudflare
- dnspod: DNSPod
- namecheap: Namecheap
- custom: Custom provider

### Provider Interface

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
```

### DNS Operations

Each provider implements:
- `getDNSRecords(domain)`: Fetch DNS records
- `addDNSRecord(domain, record)`: Add new record
- `updateDNSRecord(domain, recordId, record)`: Update existing record
- `deleteDNSRecord(domain, recordId)`: Delete record

## Commands

```bash
cd packages/server

# Database operations
pnpm prisma generate        # Generate Prisma client
pnpm prisma migrate dev     # Create migrations
pnpm prisma db push         # Push schema changes
pnpm prisma db seed         # Seed data
pnpm prisma studio          # Open database GUI

# Development
pnpm dev                    # Run with tsx

# Type check
pnpm exec tsc --noEmit
```

## Common Tasks

### Adding a New API Route

1. Create schema validation with Zod in the route file
2. Add CRUD handlers
3. Use `authenticate` middleware for user-specific data
4. Register route in `src/index.ts`

### Modifying Database Schema

1. Update `src/prisma/schema.prisma`
2. Run `pnpm prisma migrate dev`
3. Update TypeScript types if needed
4. Regenerate Prisma client: `pnpm prisma generate`

### Adding New DNS Provider

1. Create provider class extending base abstract class
2. Implement all required methods
3. Add provider config to `src/providers/providers.ts`
4. Register in the provider factory/registry

## Authentication

- JWT token generated on login/register
- Token passed via `Authorization: Bearer <token>` header
- Middleware validates token and attaches userId to request
- Token expiration: 7 days

## Testing

Test credentials (seed data):
- Username: `admin`
- Password: `password123`
