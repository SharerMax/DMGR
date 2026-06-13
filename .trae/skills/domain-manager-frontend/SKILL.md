---
name: "domain-manager-frontend"
description: "Frontend development for Domain Manager React app. Invoke when working on React components, pages, hooks, stores, or UI components in packages/client."
---

# Domain Manager Frontend

Frontend development skill for the Domain Manager React application.

## Project Context

- **Framework**: React 18 + TypeScript + Vite
- **Router**: React Router v6
- **UI Components**: shadcn/ui (Radix UI)
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: Zustand stores
- **HTTP Client**: Axios
- **Package Manager**: pnpm

## Key Paths

```
packages/client/
├── src/
│   ├── components/ui/     # shadcn/ui components
│   │   ├── alert-dialog.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── pagination.tsx
│   │   ├── select.tsx
│   │   ├── switch.tsx
│   │   ├── table.tsx
│   │   └── textarea.tsx
│   ├── hooks/
│   │   └── useConfirm.tsx  # Confirmation dialog hook
│   ├── lib/
│   │   ├── api.ts          # Axios instance with interceptors
│   │   └── utils.ts        # Utility functions (cn, date formatting)
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Domains.tsx     # Domain management + DNS records
│   │   ├── Providers.tsx   # Provider management
│   │   ├── NotificationChannels.tsx
│   │   └── Profile.tsx
│   ├── stores/             # Zustand stores
│   │   ├── auth.ts
│   │   ├── domains.ts
│   │   ├── providers.ts
│   │   ├── notificationChannels.ts
│   │   ├── dnsRecords.ts
│   │   └── theme.ts        # Theme management (system/light/dark)
│   ├── App.tsx
│   └── main.tsx
```

## Important Patterns

### Using Zustand Stores

```typescript
import { useAuthStore } from '@/stores/auth'

function MyComponent() {
  const { user, login, logout } = useAuthStore()
  // ...
}
```

### API Calls with Auth Token

API calls automatically include JWT token via Axios interceptor in `lib/api.ts`.

### Theme Support

CSS variables defined in `index.css`:
- `.dark` class for dark mode
- Default (no class) for light mode
- System preference detection available

### Confirmation Dialogs

Use the `useConfirm` hook instead of `window.confirm()`:

```typescript
import { useConfirm } from '@/hooks/useConfirm'

function MyComponent() {
  const { confirm, ConfirmDialog } = useConfirm()
  
  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Delete Item',
      description: 'Are you sure? This cannot be undone.',
      confirmText: 'Delete',
      destructive: true,
    })
    if (!confirmed) return
    // perform delete
  }
  
  return (
    <>
      {/* content */}
      <ConfirmDialog />
    </>
  )
}
```

### Adding New shadcn/ui Components

1. Create component file in `src/components/ui/`
2. Use Radix UI primitives (already installed)
3. Follow existing patterns in the codebase

## Commands

```bash
cd packages/client

# Development
pnpm dev

# Build
pnpm build

# Type check
pnpm exec tsc --noEmit
```

## Common Tasks

### Adding a New Page

1. Create page component in `src/pages/`
2. Add route in `App.tsx`
3. Use `<ProtectedRoute>` wrapper for authenticated pages

### Modifying API Calls

- API base URL configured in `src/lib/api.ts`
- All endpoints prefixed with `/api`
- Response errors handled via Axios interceptor

### Dark Mode Implementation

Theme is managed by `stores/theme.ts`:
- Applies `.dark` class to `<html>` element
- Persists user preference in localStorage
- Listens to system preference changes when in "system" mode
