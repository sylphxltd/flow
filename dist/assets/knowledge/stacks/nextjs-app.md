---
name: Next.js Application
description: Next.js App Router, Server Components, data fetching, routing, deployment
category: stacks
---

# Next.js Application Development

## When to Use Next.js vs React SPA

**Use Next.js when:**
- SEO matters (marketing sites, blogs, e-commerce)
- Need fast initial page load
- Want server-side logic with frontend
- Building full-stack app in one codebase

**Use React SPA when:**
- Dashboard/admin (no SEO needed)
- Behind authentication (not indexed)
- Complex client-side state
- Separate backend already exists

## App Router vs Pages Router

**App Router (app/)** - New, recommended
- Server Components by default (less JS shipped)
- Layouts, loading, error states built-in
- Parallel routes, intercepting routes
- Better data fetching patterns

**Pages Router (pages/)** - Legacy, stable
- More tutorials/examples available
- Simpler mental model
- Use if team familiar with it

**Decision:** Use App Router for new projects, Pages for legacy maintenance.

## Server vs Client Components

### Mental Model
**Server Components (default):**
- Render on server, send HTML
- Can access database directly
- Can't use hooks, event handlers
- Zero JavaScript to client

**Client Components ('use client'):**
- Render on server THEN hydrate on client
- Can use hooks, event handlers
- Interactive, stateful
- Ships JavaScript to client

### Decision Tree
```
Does it need interactivity? (onClick, useState, etc.)
├─ YES → Client Component ('use client')
└─ NO → Does it fetch data?
    ├─ YES → Server Component (async, fetch directly)
    └─ NO → Server Component (default, less JS)
```

### Common Patterns

**Server Component (data fetching):**
```typescript
// app/posts/page.tsx
async function PostsPage() {
  const posts = await db.posts.findMany() // Direct DB access!
  
  return (
    <div>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
```

**Client Component (interactive):**
```typescript
'use client'
import { useState } from 'react'

function LikeButton({ postId }: { postId: string }) {
  const [liked, setLiked] = useState(false)
  
  return (
    <button onClick={() => setLiked(!liked)}>
      {liked ? '❤️' : '🤍'}
    </button>
  )
}
```

**Composition (server + client):**
```typescript
// Server Component
async function PostPage() {
  const post = await db.posts.findUnique()
  
  return (
    <div>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      <LikeButton postId={post.id} /> {/* Client component inside server */}
    </div>
  )
}
```

## Data Fetching Patterns

### Server Components (Recommended)
```typescript
// Direct fetch, automatic caching
async function getData() {
  const res = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 } // Cache for 1 hour
  })
  return res.json()
}

async function Page() {
  const data = await getData()
  return <div>{data.name}</div>
}
```

### Client Components (When Needed)
```typescript
'use client'
import useSWR from 'swr'

function Profile() {
  const { data, error, isLoading } = useSWR('/api/user', fetcher)
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error</div>
  
  return <div>{data.name}</div>
}
```

### API Routes (Backend Logic)
```typescript
// app/api/posts/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const posts = await db.posts.findMany()
  return NextResponse.json(posts)
}

export async function POST(request: Request) {
  const body = await request.json()
  const post = await db.posts.create({ data: body })
  return NextResponse.json(post, { status: 201 })
}
```

## Caching & Revalidation

### Automatic Caching
Next.js caches `fetch()` by default:

```typescript
// Cached forever (until rebuild)
await fetch('https://api.example.com/data')

// Cache for 1 hour
await fetch('https://api.example.com/data', {
  next: { revalidate: 3600 }
})

// Never cache
await fetch('https://api.example.com/data', {
  cache: 'no-store'
})
```

### Revalidation Strategies

**Time-based (ISR - Incremental Static Regeneration):**
```typescript
export const revalidate = 3600 // Revalidate every hour

async function Page() {
  const data = await fetch('...')
  return <div>{data.name}</div>
}
```

**On-demand (Manual):**
```typescript
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache'

export async function POST() {
  revalidatePath('/posts') // Revalidate specific path
  // OR
  revalidateTag('posts') // Revalidate all with tag
  return Response.json({ revalidated: true })
}
```

**Dynamic (No caching):**
```typescript
export const dynamic = 'force-dynamic'

// Page always renders fresh
```

## Routing Patterns

### File-based Routing
```
app/
  page.tsx              → /
  about/page.tsx        → /about
  blog/
    page.tsx            → /blog
    [slug]/page.tsx     → /blog/:slug
  (marketing)/
    features/page.tsx   → /features (group, no route segment)
```

### Dynamic Routes
```typescript
// app/posts/[id]/page.tsx
async function PostPage({ params }: { params: { id: string } }) {
  const post = await db.posts.findUnique({ where: { id: params.id } })
  return <div>{post.title}</div>
}
```

### Layouts (Shared UI)
```typescript
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <Sidebar />
      <main>{children}</main>
    </div>
  )
}
```

### Loading & Error States
```typescript
// app/posts/loading.tsx
export default function Loading() {
  return <Skeleton />
}

// app/posts/error.tsx
'use client'
export default function Error({ error, reset }: {
  error: Error
  reset: () => void
}) {
  return (
    <div>
      <p>Something went wrong: {error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

## Authentication

### Middleware (Route Protection)
```typescript
// middleware.ts
import { NextResponse } from 'next/server'

export function middleware(request: Request) {
  const token = request.cookies.get('token')
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: '/dashboard/:path*' // Protect all /dashboard routes
}
```

### Server Actions (Form Handling)
```typescript
// app/actions.ts
'use server'

export async function createPost(formData: FormData) {
  const title = formData.get('title')
  const content = formData.get('content')
  
  // Validate
  if (!title || !content) {
    return { error: 'Missing fields' }
  }
  
  // Save to DB
  const post = await db.posts.create({
    data: { title, content }
  })
  
  revalidatePath('/posts')
  return { success: true, post }
}

// In component
function NewPostForm() {
  return (
    <form action={createPost}>
      <input name="title" />
      <textarea name="content" />
      <button type="submit">Create</button>
    </form>
  )
}
```

## Performance Optimization

### Image Optimization
```typescript
import Image from 'next/image'

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority // Above fold
  placeholder="blur" // Blur while loading
/>
```

### Font Optimization
```typescript
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  return (
    <html className={inter.className}>
      <body>{children}</body>
    </html>
  )
}
```

### Lazy Loading
```typescript
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false // Don't render on server
})
```

### Parallel Data Fetching
```typescript
// Sequential (slow)
const posts = await getPosts()
const users = await getUsers()

// Parallel (fast)
const [posts, users] = await Promise.all([
  getPosts(),
  getUsers()
])
```

## Common Pitfalls

### "use client" Misuse
**Problem:** Adding 'use client' to everything
**Solution:** Only use client components when needed (interactivity)

### Over-fetching
**Problem:** Fetching same data in multiple components
**Solution:** Fetch once in layout/page, pass as props

### Not Using Streaming
**Problem:** Waiting for all data before showing anything
**Solution:** Use Suspense boundaries
```typescript
<Suspense fallback={<Skeleton />}>
  <SlowComponent />
</Suspense>
```

### Forgetting Revalidation
**Problem:** Stale data after mutations
**Solution:** Always revalidate after mutations
```typescript
await db.posts.create(...)
revalidatePath('/posts')
```

## Environment Variables

```bash
# .env.local
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXT_PUBLIC_API_URL="https://api.example.com" # Exposed to browser
```

**Access:**
```typescript
// Server only
process.env.DATABASE_URL

// Client (must start with NEXT_PUBLIC_)
process.env.NEXT_PUBLIC_API_URL
```

## Deployment (Vercel)

**Automatic:**
- Push to GitHub
- Auto-deployed
- Preview deployments for PRs
- Edge network globally

**Performance:**
- Static pages served from edge
- Server components from edge functions
- Automatic caching
- Built-in analytics

## Decision Guide

**When to use Server Component:**
- Fetching data
- Accessing backend directly
- Large dependencies (keep off client)
- Non-interactive content

**When to use Client Component:**
- Interactive (clicks, forms, state)
- Browser APIs (localStorage, etc.)
- React hooks (useState, useEffect)
- Event handlers

**When to use API Route:**
- External API calls (hide keys)
- Webhooks
- Complex server logic
- Third-party integrations

**When to use Server Action:**
- Form submissions
- Mutations (create, update, delete)
- Simple server operations
- Progressive enhancement
