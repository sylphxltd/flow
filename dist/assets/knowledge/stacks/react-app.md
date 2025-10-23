---
name: React Application
description: React patterns, hooks, state management, performance, common bugs and fixes
---

# Frontend Development - Practical Patterns

## When to Use What (Decision Trees)

### State Management
```
Is state used by 3+ unrelated components?
├─ NO → useState in nearest common ancestor
└─ YES → Is it server data?
    ├─ YES → React Query/SWR (don't put in state!)
    └─ NO → Is it complex with many actions?
        ├─ YES → useReducer or Zustand
        └─ NO → Context API
```

### Rendering Strategy
```
Is data changing frequently (< 1min)?
├─ YES → Client-side rendering (CSR)
└─ NO → Is SEO important?
    ├─ YES → Static generation (SSG) or Server-side (SSR)
    └─ NO → Is initial load critical?
        ├─ YES → SSG
        └─ NO → CSR is fine
```

### Performance Optimization
```
Component re-rendering too much?
├─ Check: Is parent re-rendering unnecessarily?
│   └─ Fix parent first (useState callback form, useMemo)
├─ Check: Are props changing reference every render?
│   └─ Wrap in useCallback/useMemo in parent
├─ Still slow? Profile with React DevTools
    └─ Last resort: React.memo (not first move!)
```

## Common Bugs & Fixes

### Infinite useEffect Loop
**Symptom:** Component re-renders endlessly, browser freezes

**Cause #1:** Object/array in dependencies
```javascript
// BAD - new array every render
useEffect(() => {
  fetch(users)
}, [users]) // 'users' array creates infinite loop

// FIX - stringify for comparison OR use ref
useEffect(() => {
  fetch(users)
}, [JSON.stringify(users)])

// BETTER - don't depend on array, depend on primitive
useEffect(() => {
  fetch(userIds)
}, [userIds.join(',')]) // string won't cause loop
```

**Cause #2:** State update in effect without condition
```javascript
// BAD
useEffect(() => {
  setCount(count + 1) // Updates count → triggers effect → loop
}, [count])

// FIX
useEffect(() => {
  if (shouldUpdate) {
    setCount(count + 1)
  }
}, [count, shouldUpdate])
```

### Stale Closure
**Symptom:** Event handler uses old state value

```javascript
// BAD
const [count, setCount] = useState(0)
useEffect(() => {
  const interval = setInterval(() => {
    setCount(count + 1) // Always uses initial count (0)
  }, 1000)
  return () => clearInterval(interval)
}, []) // Empty deps = captures initial count

// FIX #1: Functional update
setCount(c => c + 1) // Always uses current value

// FIX #2: Include in dependencies
}, [count]) // Re-creates interval when count changes
// But this creates/destroys interval every second (not ideal)

// FIX #3: useRef for latest value
const countRef = useRef(count)
useEffect(() => { countRef.current = count })
// Use countRef.current in event handler
```

### Missing Cleanup
**Symptom:** Memory leak, warnings about state updates after unmount

```javascript
// BAD
useEffect(() => {
  subscribeToData(data => setData(data))
  // No cleanup - subscription lives after unmount
}, [])

// FIX
useEffect(() => {
  const unsubscribe = subscribeToData(data => setData(data))
  return () => unsubscribe() // Cleanup on unmount
}, [])
```

## Performance Patterns (From Real Experience)

### Don't Optimize Prematurely
**Most re-renders are fine.** React is fast. Optimize when:
1. Profiler shows actual slowness (not your feeling)
2. User-visible lag exists
3. Component renders 100+ times per second

**Wrong approach:** Wrap everything in useMemo/useCallback/React.memo
**Right approach:** Profile first, optimize specific bottlenecks

### Virtualization (When Lists Are Slow)
```javascript
// Rendering 10,000 items? Don't render them all.
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={35}
>
  {({ index, style }) => (
    <div style={style}>{items[index].name}</div>
  )}
</FixedSizeList>
```

**When to use:** 
- List has 500+ items
- User can't see all items at once
- Scrolling feels laggy

**When NOT to use:**
- Small lists (< 100 items)
- Adds complexity, use only when needed

### Debouncing Search Input
```javascript
// User types fast, don't search on every keystroke
const [query, setQuery] = useState('')
const debouncedQuery = useDebounce(query, 300)

useEffect(() => {
  if (debouncedQuery) {
    searchAPI(debouncedQuery)
  }
}, [debouncedQuery])

// useDebounce implementation
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
```

## React Query / Data Fetching

### Don't Put Server Data in useState
```javascript
// BAD - server data in component state
const [users, setUsers] = useState([])
useEffect(() => {
  fetch('/api/users')
    .then(r => r.json())
    .then(setUsers)
}, [])

// PROBLEMS:
// - No loading state
// - No error handling
// - No refetching
// - No caching
// - Stale data
// - Race conditions

// GOOD - React Query
const { data: users, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: () => fetch('/api/users').then(r => r.json())
})

// Handles: loading, errors, caching, refetching, stale data
```

### Mutations Pattern
```javascript
const mutation = useMutation({
  mutationFn: (newUser) => 
    fetch('/api/users', { 
      method: 'POST', 
      body: JSON.stringify(newUser) 
    }),
  onSuccess: () => {
    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }
})

// In component
<button onClick={() => mutation.mutate(userData)}>
  {mutation.isPending ? 'Saving...' : 'Save'}
</button>
```

## Forms (Practical Patterns)

### Controlled vs Uncontrolled
**Controlled (React state):**
- Need validation on every change
- Need to transform input (uppercase, format)
- Dependent fields (if X changes, update Y)

**Uncontrolled (refs):**
- Simple forms (just submit)
- File inputs (can't be controlled)
- Third-party widgets

### React Hook Form (Recommended)
```javascript
const { register, handleSubmit, formState: { errors } } = useForm()

const onSubmit = (data) => {
  // data is validated and ready
  saveUser(data)
}

<form onSubmit={handleSubmit(onSubmit)}>
  <input {...register('email', { 
    required: 'Email is required',
    pattern: { 
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Invalid email address'
    }
  })} />
  {errors.email && <span>{errors.email.message}</span>}
  
  <button type="submit">Submit</button>
</form>
```

**Why React Hook Form:**
- Less re-renders (uncontrolled internally)
- Built-in validation
- Better performance
- Less boilerplate

## Accessibility (What Actually Matters)

### Most Important (Do These)
1. **Semantic HTML** - Use `<button>` not `<div onClick>`
2. **Alt text** - Every image needs meaningful alt (or alt="" if decorative)
3. **Form labels** - Every input has `<label>`
4. **Keyboard nav** - Tab through entire app, Enter/Space work
5. **Focus visible** - Don't remove outline without replacement

### Screen Reader Testing
**Mac:** VoiceOver (Cmd+F5)
**Test:**
- Can you navigate with Tab?
- Does VoiceOver read meaningful text?
- Are interactive elements announced correctly?

### Common Mistakes
```javascript
// BAD - div as button
<div onClick={handleClick}>Click me</div>
// Not keyboard accessible, no role, wrong semantics

// GOOD
<button onClick={handleClick}>Click me</button>

// BAD - no label
<input type="text" placeholder="Email" />
// Placeholder is not a label

// GOOD
<label htmlFor="email">Email</label>
<input id="email" type="text" />
```

## When Things Break (Debug Workflow)

### Component Not Updating
1. Check: Is state actually changing? (console.log in render)
2. Check: Is setState being called? (console.log before setState)
3. Check: Are you mutating state? (must create new object/array)
4. Check: Is component memoized with stale props?

### Wrong Value Displayed
1. Check: When is this value set? (add console.log to setState)
2. Check: Is there a race condition? (multiple async updates)
3. Check: Stale closure? (event handler captured old value)
4. Check: Controlled component with wrong value prop?

### Performance Degradation
1. Profile with React DevTools Profiler
2. Identify which component is slow
3. Check: Is it re-rendering unnecessarily?
4. Check: Is the component itself slow? (expensive computation)
5. Optimize the actual bottleneck, not random components

## Production Patterns

### Error Boundaries
```javascript
class ErrorBoundary extends React.Component {
  state = { hasError: false }
  
  static getDerivedStateFromError(error) {
    return { hasError: true }
  }
  
  componentDidCatch(error, info) {
    logErrorToService(error, info)
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }
    return this.props.children
  }
}

// Wrap app or critical sections
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### Code Splitting
```javascript
// Route-based (most impact)
const Dashboard = lazy(() => import('./Dashboard'))
const Settings = lazy(() => import('./Settings'))

<Suspense fallback={<Loading />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/settings" element={<Settings />} />
  </Routes>
</Suspense>

// Component-based (for heavy components)
const HeavyChart = lazy(() => import('./HeavyChart'))
```

### Image Optimization
```javascript
// Next.js Image component (best practice)
<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority // For above-fold images
  placeholder="blur" // Shows blur while loading
/>

// Or native lazy loading
<img 
  src="/image.jpg" 
  loading="lazy" 
  alt="Description"
/>
```

## Key Principles

1. **Measure before optimizing** - Profiler > intuition
2. **Server data ≠ component state** - Use React Query/SWR
3. **Composition > complexity** - Small components composed
4. **Test behavior, not implementation** - User perspective
5. **Accessibility isn't optional** - Semantic HTML + keyboard nav
6. **Debug systematically** - Narrow down, don't guess
7. **Ship working code, then optimize** - Don't premature optimize

## When in Doubt

- **State management confused?** → Start with useState, refactor later
- **Performance slow?** → Profile first, identify bottleneck
- **Accessibility unclear?** → Use semantic HTML, test with keyboard
- **Form complex?** → React Hook Form
- **Data fetching messy?** → React Query
- **Not sure?** → Pick the simpler option, refactor if needed
