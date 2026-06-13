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

## shadcn/ui Patterns (Important)

This project follows shadcn/ui patterns. Key rules:

### Styling Rules
- **Use `gap-*` instead of `space-y-*` / `space-x-*`**: `flex flex-col gap-4` not `space-y-4`
- **Use semantic colors**: `bg-primary`, `text-muted-foreground` - never raw values like `bg-blue-500` or `text-gray-500`
- **Use `size-*` for equal dimensions**: `size-10` not `w-10 h-10`
- **Use `truncate` shorthand**: not `overflow-hidden text-ellipsis whitespace-nowrap`
- **Use `cn()` for conditional classes**: `cn("flex", isActive && "bg-primary")`
- **No manual z-index on overlays**: Dialog, Sheet, DropdownMenu handle their own stacking

### Form Patterns
- Use `FieldGroup` + `Field` for form layouts (if available)
- Use `Label` component with `htmlFor` attribute
- Validation: `data-invalid` on Field, `aria-invalid` on control

### Component Usage
- **Status colors**: Use Badge variants or semantic tokens, not raw colors
  - Correct: `<Badge variant="secondary">+20.1%</Badge>`
  - Incorrect: `<span className="text-emerald-600">+20.1%</span>`
- **Empty states**: Use proper Empty component patterns
- **Loading**: Use Skeleton instead of `animate-pulse` divs
- **Icons in Button**: Use `data-icon="inline-start"` attribute, no sizing classes on icons

### Card Composition
Use full Card composition:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```

### Key Paths

```
packages/client/
├── src/
│   ├── components/ui/     # shadcn/ui components
│   │   ├── alert-dialog.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── calendar.tsx    # Date picker using react-day-picker
│   │   ├── card.tsx
│   │   ├── date-picker.tsx # DateRangePicker component
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── pagination.tsx
│   │   ├── popover.tsx     # Popover wrapper for Calendar
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
│   │   ├── RenewalLogs.tsx  # Renewal logs with filtering
│   │   ├── NotificationChannels.tsx
│   │   └── Profile.tsx
│   ├── stores/             # Zustand stores
│   │   ├── auth.ts
│   │   ├── domains.ts
│   │   ├── providers.ts
│   │   ├── notificationChannels.ts
│   │   ├── dnsRecords.ts
│   │   └── theme.ts        # Theme management (system/light/dark)
│   ├── api/                # API functions
│   │   └── renewalLogs.ts   # Renewal logs API
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
2. Use Radix UI primitives (already installed in package.json)
3. Follow shadcn/ui patterns:
   - Use `cva` for variant management
   - Use `cn()` utility for class merging
   - Export both component and variants
   - Follow proper composition patterns (Items inside Groups)

### shadcn/ui CLI (if project has components.json)

If the project has `components.json`:
```bash
cd packages/client
npx shadcn@latest add button card dialog
```

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
