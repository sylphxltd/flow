---
name: Next.js Application
description: Next.js App Router, Server Components, data fetching, routing, deployment
---

# Next.js Development

## When Next.js vs React SPA

**Next.js**: SEO matters, fast initial load, full-stack in one codebase
**React SPA**: Dashboard/admin, behind auth, separate backend exists

## App Router vs Pages Router

**App Router (app/)** - Recommended:
- Server Components by default (less JS)
- Built-in layouts, loading, error states
- Better data fetching patterns

**Pages Router (pages/)**: Legacy maintenance only

## Server vs Client Components

### Decision Tree
```
Needs interactivity? (onClick, useState, hooks)
├─ YES → 'use client'
└─ NO → Server Component (default)
```

**Server Components (default):**
- Render on server, direct DB access, zero client JS
- Can't use hooks/handlers

**Client Components ('use client'):**
- Hooks, handlers, interactivity, ships JS to browser

### Composition Pattern
Server components wrap client components. Fetch data in server, pass as props to client.

## Data Fetching

### Cache Options
```typescript
// Cached forever (default)
await fetch('https://api.example.com/data')

// Cache with revalidation
await fetch('...', { next: { revalidate: 3600 } })

// Never cache
await fetch('...', { cache: 'no-store' })
```

### Parallel Fetching
```typescript
// BAD - Sequential
const posts = await getPosts()
const users = await getUsers()

// GOOD - Parallel
const [posts, users] = await Promise.all([getPosts(), getUsers()])
```

## Caching & Revalidation

**Time-based (ISR):**
```typescript
export const revalidate = 3600 // Every hour
```

**On-demand:**
```typescript
import { revalidatePath, revalidateTag } from 'next/cache'
revalidatePath('/posts')
revalidateTag('posts')
```

**Dynamic (no cache):**
```typescript
export const dynamic = 'force-dynamic'
```

## Routing

### File Structure
```
app/page.tsx              → /
app/about/page.tsx        → /about
app/blog/[slug]/page.tsx  → /blog/:slug
app/(marketing)/features/page.tsx → /features (route group)
```

### Special Files
- `layout.tsx`: Shared UI for segment + children
- `loading.tsx`: Loading UI (Suspense boundary)
- `error.tsx`: Error UI (must be 'use client')

## Authentication

### Middleware (Route Protection)
```typescript
// middleware.ts
export function middleware(request: Request) {
  const token = request.cookies.get('token')
  if (!token) return NextResponse.redirect(new URL('/login', request.url))
}

export const config = { matcher: '/dashboard/:path*' }
```

### Server Actions (Form Handling)
```typescript
// app/actions.ts
'use server'

export async function createPost(formData: FormData) {
  const title = formData.get('title')
  if (!title) return { error: 'Missing title' }

  const post = await db.posts.create({ data: { title } })
  revalidatePath('/posts')
  return { success: true, post }
}

// In component
<form action={createPost}>
  <input name="title" />
  <button type="submit">Create</button>
</form>
```

## Performance

**Image**: Use `<Image>` with `priority` for above-fold, `placeholder="blur"` for UX
**Font**: `next/font/google` for automatic optimization
**Code Splitting**: `dynamic(() => import('./Heavy'), { ssr: false })` for client-only heavy components

## Common Pitfalls

❌ **'use client' everywhere** → Only for interactivity
❌ **Over-fetching** → Fetch once in layout/page, pass as props
❌ **Not streaming** → Use Suspense boundaries
❌ **Forgetting revalidation** → Always revalidate after mutations

## Environment Variables

```bash
DATABASE_URL="..." # Server only
NEXT_PUBLIC_API_URL="..." # Exposed to browser (must start with NEXT_PUBLIC_)
```

## Decision Guide

**Server Component:**
- Fetching data, backend access, large dependencies, non-interactive

**Client Component:**
- Interactive (clicks, state, hooks), browser APIs, event handlers

**API Route:**
- Hide API keys, webhooks, complex server logic, third-party integrations

**Server Action:**
- Form submissions, mutations (CRUD), simple server ops
