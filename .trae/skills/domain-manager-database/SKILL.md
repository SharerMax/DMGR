---
name: "domain-manager-database"
description: "Manages Domain Manager database operations. Invoke when working with Prisma, migrations, seeding, or database schema changes."
---

# Domain Manager Database

Database management skill for the Domain Manager application.

## Technology Stack

- **Database**: SQLite
- **ORM**: Prisma
- **Location**: `packages/server/`

## Key Files

```
packages/server/
├── prisma/
│   └── dev.db           # SQLite database file
├── src/prisma/
│   ├── schema.prisma     # Database schema definition
│   ├── seed.ts          # Seed data script
│   ├── generated/       # Generated Prisma client
│   └── migrations/      # Migration history
└── prisma.config.ts     # Prisma configuration
```

## Prisma Commands

```bash
cd packages/server

# Generate Prisma Client (after schema changes)
pnpm prisma generate

# Create and apply migrations
pnpm prisma migrate dev

# Push schema without migration (for development)
pnpm prisma db push

# Open Prisma Studio (database GUI)
pnpm prisma studio

# Reset database (WARNING: deletes all data)
pnpm prisma migrate reset

# Validate schema
pnpm prisma validate

# Seed database
pnpm prisma db seed
```

## Schema Structure

### Current Models

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

model Provider {
  id               Int      @id @default(autoincrement())
  type             String
  name             String
  config           String   // JSON
  supportsAutoRenew Boolean @default(false)
  userId           Int
  user             User     @relation(...)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  domains          Domain[]
}

model Domain {
  id           Int        @id @default(autoincrement())
  name         String
  providerId   Int?
  provider     Provider?  @relation(...)
  userId       Int
  user         User       @relation(...)
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

model DNSRecord {
  id        Int      @id @default(autoincrement())
  domainId  Int
  domain    Domain   @relation(...)
  type      String
  name      String
  value     String
  ttl       Int      @default(3600)
  priority  Int?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Reminder {
  id         Int       @id @default(autoincrement())
  domainId   Int
  domain     Domain    @relation(...)
  daysBefore Int
  notified   Boolean   @default(false)
  notifyDate DateTime?
  createdAt  DateTime  @default(now())
}

model NotificationChannel {
  id          Int      @id @default(autoincrement())
  userId      Int
  user        User     @relation(...)
  type        String   // email, sms, webhook
  name        String
  config      String   // JSON
  defaultDays Int      @default(90)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Common Tasks

### Adding a New Table

1. Edit `src/prisma/schema.prisma`:

```prisma
model NewModel {
  id        Int      @id @default(autoincrement())
  field1    String
  field2    Int?
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}
```

2. Run migration:
```bash
pnpm prisma migrate dev --name add_new_model
```

3. Update TypeScript types if needed

### Adding a New Field

1. Edit `src/prisma/schema.prisma`:

```prisma
model Domain {
  // ... existing fields
  newField String?  // Optional field
  // or
  newField String   // Required field (careful with existing data!)
}
```

2. Apply changes:
```bash
pnpm prisma migrate dev --name add_new_field
```

### Seeding Data

Edit `src/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create test user
  const user = await prisma.user.create({
    data: {
      username: 'admin',
      password: 'hashed_password', // Use bcrypt!
      email: 'admin@example.com'
    }
  })
  
  // Create related data
  await prisma.domain.create({
    data: {
      name: 'example.com',
      userId: user.id,
      expiryDate: new Date('2025-12-31'),
      autoRenew: false
    }
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Run seed:
```bash
pnisma db seed
```

## Query Examples

### Basic CRUD

```typescript
import { prisma } from '@/db'

// Create
const domain = await prisma.domain.create({
  data: {
    name: 'example.com',
    userId: 1,
    expiryDate: new Date()
  }
})

// Read
const domains = await prisma.domain.findMany({
  where: { userId: 1 },
  include: { provider: true, dnsRecords: true }
})

// Update
await prisma.domain.update({
  where: { id: 1 },
  data: { autoRenew: true }
})

// Delete
await prisma.domain.delete({
  where: { id: 1 }
})
```

### Complex Queries

```typescript
// Find domains expiring within N days
const expiringDomains = await prisma.domain.findMany({
  where: {
    userId: 1,
    expiryDate: {
      lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  }
})

// Count domains per provider
const stats = await prisma.domain.groupBy({
  by: ['providerId'],
  _count: { id: true }
})

// Include nested relations
const domainWithDetails = await prisma.domain.findUnique({
  where: { id: 1 },
  include: {
    provider: true,
    reminders: true,
    dnsRecords: {
      where: { type: 'A' },
      orderBy: { name: 'asc' }
    }
  }
})
```

## Troubleshooting

### Database Locked

```bash
# Stop all server instances
# Then try:
rm prisma/dev.db-journal
```

### Migration Failed

```bash
# Check migration status
pnpm prisma migrate status

# Resolve issues, then:
pnpm prisma migrate dev
```

### Client Out of Sync

```bash
pnpm prisma generate
```

## Safety Warnings

- **Never** modify `prisma/dev.db` directly with external tools
- **Always** backup data before migrations in production
- Use `db push` for quick development changes
- Use `migrate dev` for versioned migrations
- **Never** commit `prisma/dev.db` with production-like data
