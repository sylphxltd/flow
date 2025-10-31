---
name: React Application
description: React patterns, hooks, state management, performance, common bugs and fixes
---

# React Development

## State Management Decision Tree
```
Used by 3+ unrelated components?
├─ NO → useState in common ancestor
└─ YES → Server data?
    ├─ YES → React Query/SWR (not state!)
    └─ NO → Complex actions?
        ├─ YES → useReducer / Zustand
        └─ NO → Context API
```

## Common Bugs & Fixes

### Infinite useEffect Loop

**Object/array deps:**
```javascript
// BAD
useEffect(() => { fetch(users) }, [users])

// FIX
useEffect(() => { fetch(users) }, [userIds.join(',')])  // Primitive
```

**Unconditional state update:**
```javascript
// BAD
useEffect(() => { setCount(count + 1) }, [count])

// FIX
useEffect(() => {
  if (condition && count < max) setCount(count + 1)
}, [count, condition, max])
```

### Stale Closure

```javascript
// BAD - uses initial count
const [count, setCount] = useState(0)
useEffect(() => {
  setInterval(() => setCount(count + 1), 1000)
}, [])

// FIX: Functional update
setInterval(() => setCount(c => c + 1), 1000)

// FIX: useRef (complex cases)
const countRef = useRef(count)
useEffect(() => { countRef.current = count })
useEffect(() => {
  setInterval(() => setCount(countRef.current + 1), 1000)
}, [])
```

### Missing Cleanup

```javascript
// BAD
useEffect(() => {
  subscribeToData(setData)
}, [])

// GOOD
useEffect(() => {
  const unsubscribe = subscribeToData(setData)
  return () => unsubscribe()
}, [])
```

## Performance

**Optimize when:**
- Profiler shows slowness
- User-visible lag
- 100+ renders/second

**Profile first, optimize second.**

### Unnecessary Re-renders

```javascript
// BAD
function Parent() {
  const config = { theme: 'dark' }
  return <Child config={config} />
}

// GOOD
const config = useMemo(() => ({ theme: 'dark' }), [])
```

**Order:**
1. Fix parent
2. useMemo/useCallback
3. Profile
4. React.memo (last resort)

### Virtualization

**When**: 500+ items, laggy scroll

```javascript
import { FixedSizeList } from 'react-window'
<FixedSizeList height={600} itemCount={items.length} itemSize={35}>
  {({ index, style }) => <div style={style}>{items[index]}</div>}
</FixedSizeList>
```

### Debounce Search

```javascript
const debouncedQuery = useDebounce(query, 300)
useEffect(() => {
  if (debouncedQuery) searchAPI(debouncedQuery)
}, [debouncedQuery])
```

## Data Fetching

**Never** useState for server data. You lose: caching, loading, errors, refetching, race conditions.

**Use React Query:**
```javascript
const { data, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: () => fetch('/api/users').then(r => r.json())
})

const mutation = useMutation({
  mutationFn: (user) => fetch('/api/users', { method: 'POST', body: JSON.stringify(user) }),
  onSuccess: () => queryClient.invalidateQueries(['users'])
})
```

## Forms

**React Hook Form** (recommended):
```javascript
const { register, handleSubmit, formState: { errors } } = useForm()

<form onSubmit={handleSubmit(onSubmit)}>
  <input {...register('email', {
    required: 'Required',
    pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i }
  })} />
  {errors.email && <span>{errors.email.message}</span>}
</form>
```

**Controlled vs Uncontrolled:**
- Controlled: Validation on change, dependent fields
- Uncontrolled: Simple submit, file inputs

## Accessibility

**Critical:**
1. Semantic HTML (`<button>` not `<div onClick>`)
2. Alt text (meaningful or `alt=""`)
3. Form labels (every input)
4. Keyboard nav (Tab, Enter/Space)
5. Focus visible

**Test**: VoiceOver (Cmd+F5), Tab through app

```javascript
// BAD
<div onClick={handleClick}>Click</div>

// GOOD
<button onClick={handleClick}>Click</button>
```

## Debug Workflow

**Component not updating:**
1. State changing? (console.log)
2. setState called?
3. Mutating state? (must create new)
4. Memoized with stale props?

**Performance:**
1. Profile (React DevTools)
2. Identify slow component
3. Check: Unnecessary re-renders?
4. Check: Expensive computation?
5. Optimize bottleneck only

## Production Patterns

**Error Boundary:**
```javascript
class ErrorBoundary extends React.Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error, info) { logError(error, info) }
  render() {
    return this.state.hasError ? <ErrorFallback /> : this.props.children
  }
}
```

**Code Splitting:**
```javascript
const Dashboard = lazy(() => import('./Dashboard'))
<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>
```

## Key Decisions

**State unclear?** → useState, refactor later
**Performance slow?** → Profile first
**Form complex?** → React Hook Form
**Data fetching?** → React Query
**Not sure?** → Simpler option

## Anti-Patterns

❌ Server data in useState
❌ Premature optimization
❌ React.memo everywhere
❌ Missing cleanup
❌ Div as button
