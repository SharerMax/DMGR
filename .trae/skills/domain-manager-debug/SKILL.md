---
name: "domain-manager-debug"
description: "Debugs Domain Manager application issues. Invoke when user reports bugs, errors, unexpected behavior, or needs help troubleshooting problems in frontend or backend."
---

# Domain Manager Debugger

Debugging skill for the Domain Manager application.

## Debugging Workflow

When debugging, follow this systematic approach:

1. **Gather Information**: Understand the error/bug
2. **Reproduce**: Try to reproduce the issue
3. **Isolate**: Find the root cause
4. **Fix**: Implement the solution
5. **Verify**: Confirm the fix works

## Common Issues

### Frontend Issues

#### API Calls Failing

Check in order:
1. Is the backend server running? (`pnpm dev:server`)
2. Is the frontend connecting to correct API URL? (`src/lib/api.ts`)
3. Is the JWT token valid and not expired?
4. Check browser Network tab for actual error response

```typescript
// src/lib/api.ts - API base URL configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  // ...
})
```

#### State Not Updating

1. Verify store actions are being called
2. Check if state is properly updated in Zustand store
3. Ensure components are subscribed to store correctly
4. Check for React rendering issues

#### Dark Mode Not Working

1. Check if `.dark` class is applied to `<html>` element
2. Verify `stores/theme.ts` is initialized in `App.tsx`
3. Check localStorage for theme preference
4. Verify CSS variables are defined in `index.css`

#### Dialog/Modal Issues

1. Check if dialog is properly opened/closed
2. Verify state management for dialog visibility
3. For confirmation dialogs, ensure `ConfirmDialog` component is rendered
4. Check z-index conflicts

### Backend Issues

#### Database Connection Error

```bash
cd packages/server
pnpm prisma generate
pnpm prisma db push
```

#### Prisma Errors

```bash
# View database with GUI
pnpm prisma studio

# Reset database (destroys data)
pnpm prisma migrate reset
```

#### API Returns 401 Unauthorized

1. Check if JWT token is being sent in request header
2. Verify token hasn't expired
3. Check if token is correctly decoded
4. Verify `authenticate` middleware is applied to route

#### Provider Sync Fails

1. Verify provider credentials are correct
2. Check provider API is accessible
3. Look at server logs for specific error messages
4. Test provider API independently

## Diagnostic Commands

### Frontend

```bash
cd packages/client

# Type check
pnpm exec tsc --noEmit

# Build check
pnpm build

# Clear cache
rm -rf node_modules/.vite
```

### Backend

```bash
cd packages/server

# Type check
pnpm exec tsc --noEmit

# Database check
pnpm prisma validate

# View logs (if logging is implemented)
```

## Logging

### Frontend Logging

Use console for client-side debugging:
```typescript
console.log('Debug info:', data)
console.error('Error:', error)
```

### Backend Logging

Check for error messages in server output when running with `pnpm dev`.

## Testing Changes

### Frontend

1. Save changes (Vite hot reload should update)
2. Test in browser
3. Check browser console for errors

### Backend

1. Server auto-restarts with tsx
2. Test with frontend or API client
3. Check terminal for errors

## Collecting Evidence

When reporting issues, include:

1. **Error Message**: Full error text
2. **Steps to Reproduce**: What you did
3. **Expected vs Actual**: What should happen vs what happens
4. **Browser/Environment**: Browser version, OS
5. **Relevant Code**: The code causing the issue
6. **Console/Server Logs**: Any error output

## Quick Fixes

### Clear All Data and Reset

```bash
cd packages/server
rm prisma/dev.db
pnpm prisma migrate dev
pnpm prisma db seed
```

### Fix Node Modules Issues

```bash
# Clear and reinstall
rm -rf node_modules
pnpm install
```

### Fix Build Issues

```bash
# Clear Vite cache
rm -rf packages/client/node_modules/.vite

# Rebuild
cd packages/client && pnpm build
```
