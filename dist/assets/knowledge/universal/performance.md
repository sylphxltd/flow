---
name: Performance Optimization
description: Profiling, caching, optimization patterns across frontend and backend
---

# Performance Optimization

## Measure First
**Never optimize without measuring.**

### Tools
- Chrome DevTools Performance tab
- Lighthouse for web vitals
- React DevTools Profiler
- Backend: APM tools (New Relic, Datadog)
- Database: Query explain plans

### Metrics
**Frontend:**
- FCP (First Contentful Paint): < 1.8s
- LCP (Largest Contentful Paint): < 2.5s
- CLS (Cumulative Layout Shift): < 0.1
- FID (First Input Delay): < 100ms
- TTI (Time to Interactive): < 3.5s

**Backend:**
- Response time: < 200ms (p95)
- Throughput: requests/second
- Error rate: < 1%
- Database query time: < 100ms

## Frontend Optimization

### Bundle Size
**Analyze:**
- `webpack-bundle-analyzer` to visualize
- Identify large dependencies

**Reduce:**
- Tree-shaking (remove unused code)
- Code splitting (dynamic imports)
- Replace heavy libraries with lighter alternatives
- Remove unused dependencies

### Loading Strategy
**Critical path:**
1. Inline critical CSS
2. Defer non-critical CSS
3. Async non-critical JavaScript
4. Lazy load below-the-fold images

**Code splitting:**
```javascript
// Route-based
const Home = lazy(() => import('./Home'))

// Component-based
const HeavyChart = lazy(() => import('./Chart'))
```

### Images
- WebP format (smaller, better quality)
- Responsive images (srcset)
- Lazy loading (loading="lazy")
- CDN delivery
- Optimize: compress, resize, correct format

### Caching
**Browser cache:**
- Cache-Control headers
- Versioned assets (hash in filename)
- Service worker for offline

**CDN:**
- Static assets on CDN
- Edge caching for dynamic content
- Geographic distribution

## React Performance

### Avoid Re-renders
**Identify:**
- React DevTools Profiler
- "Why did you render" library

**Fix:**
- `React.memo` for pure components
- `useMemo` for expensive computations
- `useCallback` for function props
- Move static data outside component

### Virtualization
**Problem:** Rendering 10,000+ items is slow
**Solution:** Render only visible items
**Libraries:** react-window, react-virtualized

### Debouncing/Throttling
**Debounce:** Wait for user to stop (search input)
**Throttle:** Limit frequency (scroll handler)

```javascript
// Debounce: 300ms after last input
const debouncedSearch = useMemo(
  () => debounce(search, 300),
  []
)

// Throttle: max once per 100ms
const throttledScroll = useMemo(
  () => throttle(handleScroll, 100),
  []
)
```

## Backend Performance

### Database Optimization
**Indexes:**
- Index columns used in WHERE, JOIN, ORDER BY
- Composite indexes for multi-column queries
- Don't over-index (slows writes)

**Query optimization:**
- Use EXPLAIN to analyze
- Avoid SELECT *
- Limit results (pagination)
- Use connection pooling
- Batch operations when possible

**N+1 Problem:**
```javascript
// BAD: N+1 queries
for (user of users) {
  user.posts = await getPosts(user.id)
}

// GOOD: 1 query with JOIN or IN
const posts = await getPostsByUserIds(userIds)
```

### Caching Strategy
**What to cache:**
- Database query results
- API responses
- Computed values
- Session data

**Cache invalidation:**
- Time-based (TTL)
- Event-based (on update/delete)
- Hybrid (TTL + manual invalidation)

**Layers:**
1. Application memory (fastest, limited size)
2. Redis/Memcached (fast, scalable)
3. Database query cache
4. CDN (static assets)

### Async Processing
**Move slow operations to background:**
- Email sending
- Image processing
- Report generation
- Data aggregation

**Tools:**
- Job queues (Bull, BullMQ)
- Message queues (RabbitMQ, Kafka)
- Serverless functions

### Response Time
**Techniques:**
- Gzip compression
- HTTP/2 multiplexing
- Keep-alive connections
- Parallel requests
- Early hints (103 status)

## Database Performance

### Connection Management
- Connection pooling (reuse connections)
- Configure pool size (too many = resource waste)
- Monitor connection usage
- Close idle connections

### Query Performance
**Slow query log:**
- Identify queries > 100ms
- Add indexes
- Rewrite inefficient queries
- Consider denormalization

**Pagination:**
```sql
-- Offset-based (simple, slow for large offsets)
LIMIT 20 OFFSET 100

-- Cursor-based (fast, complex)
WHERE id > last_seen_id LIMIT 20
```

### Scaling
**Vertical:** Bigger server (limited)
**Horizontal:**
- Read replicas (scale reads)
- Sharding (partition data)
- Database-per-service (microservices)

## Monitoring & Profiling

### Frontend
- Real User Monitoring (RUM)
- Synthetic monitoring
- Core Web Vitals tracking
- Error tracking (Sentry)

### Backend
- APM (Application Performance Monitoring)
- Log aggregation (ELK, Datadog)
- Alerting on threshold breaches
- Distributed tracing (microservices)

### Continuous Improvement
1. Set performance budgets
2. Monitor metrics
3. Alert on regression
4. Profile bottlenecks
5. Optimize
6. Measure impact
7. Repeat

## Common Pitfalls

### Premature Optimization
- Optimize AFTER measuring
- Focus on biggest bottlenecks
- 80/20 rule: 20% of code = 80% of time

### Over-caching
- Cache invalidation is hard
- Stale data causes bugs
- Memory limits
- Only cache stable, expensive data

### Ignoring Network
- Minimize requests
- Reduce payload size
- Use HTTP/2
- Consider latency (geography)

### Blocking Operations
- Never block event loop (Node.js)
- Use async for I/O
- Worker threads for CPU-intensive
