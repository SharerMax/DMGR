---
name: "domain-manager-review"
description: "Reviews Domain Manager code for quality and best practices. Invoke when user asks for code review, before commits, or wants feedback on code changes."
---

# Domain Manager Code Reviewer

Code review skill for the Domain Manager application.

## Review Checklist

### General Quality

- [ ] Code follows project conventions
- [ ] No duplicate code
- [ ] Functions are reasonably sized (< 100 lines ideal)
- [ ] Proper error handling
- [ ] No commented out code
- [ ] No console.log/debug code left in
- [ ] TypeScript types are correct and complete

### Frontend Specific

- [ ] React components follow existing patterns
- [ ] Zustand stores are properly structured
- [ ] API calls use existing patterns from `lib/api.ts`
- [ ] UI components from shadcn/ui are properly imported
- [ ] Dark mode support considered (CSS variables used)
- [ ] Loading and error states handled
- [ ] Forms have proper validation
- [ ] No `any` types without good reason
- [ ] Components are properly memoized if needed

### Backend Specific

- [ ] Zod schemas validate all input
- [ ] Routes use `authenticate` middleware when needed
- [ ] Database queries use Prisma properly
- [ ] Error responses are consistent
- [ ] No sensitive data in responses
- [ ] Database transactions used for multi-table operations
- [ ] Environment variables used for secrets

### Security

- [ ] No hardcoded secrets/credentials
- [ ] User can only access their own data
- [ ] Input is validated before use
- [ ] SQL injection prevented (Prisma handles this)
- [ ] XSS prevention (React handles this)

## Common Issues to Look For

### Frontend

```typescript
// Bad: Using any
const data: any = response.data

// Good: Proper typing
const data: Domain = response.data

// Bad: Mutating state directly
domains.push(newDomain)
setDomains(domains)

// Good: Immutable update
setDomains(prev => [...prev, newDomain])

// Bad: Missing loading state
if (loading) return <div>Loading...</div>

// Good: Full loading state with timeout
const [loading, setLoading] = useState(true)
// Show loading, error, or content appropriately
```

### Backend

```typescript
// Bad: Missing validation
router.post('/', async (req, res) => {
  const item = await prisma.item.create({ data: req.body })
  res.json(item)
})

// Good: Zod validation
const createSchema = z.object({ name: z.string() })
router.post('/', async (req, res) => {
  const data = createSchema.parse(req.body)
  const item = await prisma.item.create({ data })
  res.json(item)
})

// Bad: Not checking user ownership
router.delete('/:id', async (req, res) => {
  await prisma.item.delete({ where: { id: +req.params.id } })
  res.json({ success: true })
})

// Good: Verify ownership
router.delete('/:id', async (req, res) => {
  const item = await prisma.item.findUnique({ where: { id: +req.params.id } })
  if (item?.userId !== req.userId) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  await prisma.item.delete({ where: { id: +req.params.id } })
  res.json({ success: true })
})
```

## Review Focus Areas

### Recently Modified Code

Always pay extra attention to:
- Changes in routes
- Database queries
- Authentication/authorization
- New components
- State management changes

### Code That Should Be Flagged

1. **Security Issues**
   - Hardcoded credentials
   - Missing authorization checks
   - Unvalidated user input

2. **Performance Problems**
   - N+1 queries
   - Missing indexes
   - Unnecessary re-renders

3. **Maintainability Issues**
   - Very long functions
   - Deeply nested code
   - Magic numbers/strings

## Review Comments Format

When providing feedback, be constructive:

```markdown
## Issue: [Brief Title]

**Problem**: What is wrong

**Location**: File:line or Component:Function

**Suggestion**: How to fix it

**Severity**: [Critical/Major/Minor]
```

## Areas Requiring Extra Scrutiny

1. **Authentication/Authorization**
   - New routes must check user identity
   - User-scoped data queries must include userId filter

2. **Database Schema Changes**
   - Must run migrations properly
   - Need to consider existing data migration

3. **External API Integration**
   - Provider implementations
   - Error handling for API failures

4. **Form Submissions**
   - Client-side validation
   - Server-side validation
   - Error message display
