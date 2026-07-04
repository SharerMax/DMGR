# Domain Manager

> Domain Management System — All-in-one platform for domain, DNS record, auto-renewal, and expiration reminder management
>
> English | [中文](./README.md)

## Introduction

Domain Manager is a domain management system built with React + Express + Prisma + SQLite, supporting multi-DNS provider integration, DNS record sync, automatic domain renewal, and expiration notifications.

## Features

- **Domain Management**: Unified management of domains across multiple providers with expiration reminders
- **DNS Record Management**: CRUD operations on DNS records with automatic sync to providers
- **Provider Integration**: Supports Alibaba Cloud, Tencent Cloud, Cloudflare, DNSPod, Namecheap, VPS8, and more
- **Auto Renewal**: Automated domain renewal with configurable cron schedule
- **Notifications**: Multi-channel notifications (email, SMS, Webhook) with automatic expiration alerts
- **Renewal Logs**: Complete renewal operation history with full traceability

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 19 + TypeScript + Vite + shadcn/ui + Tailwind CSS + Zustand |
| Backend | Express 5 + Prisma ORM + SQLite + Zod 4 + Pino |
| Package Management | pnpm monorepo with catalog for unified dependency versions |
| Authentication | JWT (Bearer Token) |

## Project Structure

```
domain/
├── packages/
│   ├── client/          # Frontend (React + Vite)
│   │   └── src/
│   │       ├── pages/       # Page components
│   │       ├── stores/      # Zustand state management
│   │       ├── components/  # Components (ui/ is shadcn/ui)
│   │       ├── lib/         # API client & utilities
│   │       └── hooks/       # Custom hooks
│   └── server/          # Backend (Express + Prisma)
│       └── src/
│           ├── routes/      # API routes (controller layer)
│           ├── services/    # Business service layer
│           ├── models/      # Data access layer
│           ├── providers/   # DNS provider adapters
│           ├── middleware/  # Middleware
│           ├── prisma/      # Prisma schema & migrations
│           ├── db/          # Database initialization
│           └── utils/       # Utility functions
├── pnpm-workspace.yaml  # Workspace & catalog config
└── package.json
```

## Quick Start

### Requirements

- Node.js >= 22.21
- pnpm >= 11

### Install Dependencies

```bash
pnpm install
```

### Initialize Database

```bash
cd packages/server
pnpm prisma migrate dev
pnpm prisma db seed
```

### Start Development

```bash
# Start backend (http://localhost:3001)
pnpm dev:server

# Start frontend (http://localhost:3000)
pnpm dev:client
```

### Build

```bash
pnpm build
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `JWT_SECRET` | - | JWT secret (required in production) |
| `LOG_LEVEL` | `info` | Log level |
| `LOG_DIR` | `./logs` | Log file directory (production) |
| `RENEWAL_CRON_EXPRESSION` | `0 2 * * *` | Auto-renewal cron expression |

## Test Account

- Username: `admin` / Password: `password123`
- Email: `admin@example.com` / Password: `password123`

## API Endpoints

All endpoints return a unified response format:

```json
{
  "code": 0,
  "message": "Success",
  "data": {}
}
```

Main endpoints:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/domains` | Domain list |
| POST | `/api/domains` | Create domain |
| PUT | `/api/domains/:id` | Update domain |
| DELETE | `/api/domains/:id` | Delete domain |
| GET | `/api/providers` | Provider list |
| GET | `/api/dns-records` | DNS record list |
| GET | `/api/renewal-logs` | Renewal logs |
| GET | `/api/renewal-logs/config` | Auto-renewal config |
| PUT | `/api/renewal-logs/config` | Update auto-renewal config |
| POST | `/api/renewal-logs/trigger` | Manually trigger renewal |
| GET | `/api/notification-channels` | Notification channel list |

## Development Conventions

1. Use `pnpm` as the package manager, with catalog for unified dependency management
2. After code changes: format → build → type check
3. Backend layered architecture: `routes → services → models → db/prisma`, no cross-layer calls
4. Route layer may only call services/, no direct imports of models/ or prisma
5. Wildcard routes `/:id` must come after all concrete path routes
6. Unified API response format: `{ code, message, data }`
7. Unified logging: use Pino logger, no `console.*`
8. Production logs written to files (rotating-file-stream, daily rotation, 30-day retention)

## License

MIT
