---
name: Performance Optimization
description: Profiling, caching, optimization patterns across frontend and backend
---

# Performance Optimization

## Measure First

**Never optimize without measuring.**

### Tools
**Frontend**: Chrome DevTools, Lighthouse, React Profiler
**Backend**: APM (New Relic, Datadog), query explain plans

### Metrics
**Frontend**: FCP < 1.8s, LCP < 2.5s, CLS < 0.1, FID < 100ms, TTI < 3.5s
**Backend**: Response < 200ms (p95), error rate < 1%, DB query < 100ms

## Frontend Optimization

### Bundle Size
**Analyze**: webpack-bundle-analyzer
**Reduce**: Tree-shaking, code splitting, lighter alternatives, remove unused deps

### Loading Strategy
1. Inline critical CSS
2. Defer non-critical CSS
3. Async non-critical JS
4. Lazy load below-fold images
5. Code splitting: `lazy(() => import('./Heavy'))`

### Images
- WebP format (smaller, better quality)
- Responsive (srcset)
- Lazy loading (loading="lazy")
- CDN delivery
- Optimize: compress, resize, correct format

### Caching
**Browser**: Cache-Control headers, versioned assets (hash), service worker
**CDN**: Static assets, edge caching, geographic distribution

## React Performance

### Avoid Re-renders
**Identify**: React DevTools Profiler, "Why did you render" library

**Fix**: React.memo (pure components), useMemo (expensive computations), useCallback (function props), move static data outside component

### Virtualization
**Problem**: 10,000+ items
**Solution**: react-window / react-virtualized (render only visible)

### Debounce/Throttle
- **Debounce**: Wait for user to stop (search input)
- **Throttle**: Limit frequency (scroll handler)

## Backend Performance

### Database Optimization

**Indexes**: Index WHERE/JOIN/ORDER BY columns, composite for multi-column, don't over-index (slows writes)

**Queries**: EXPLAIN to analyze, avoid SELECT *, LIMIT for pagination, connection pooling, batch operations

**N+1 Problem**: See sql.md for patterns

### Caching Strategy

**What**: Query results, API responses, computed values, sessions
**Invalidation**: Time-based (TTL), event-based (on update), hybrid
**Layers**: App memory (fastest) → Redis → DB cache → CDN

### Async Processing

**Background**: Email, image processing, reports, aggregation
**Tools**: Job queues (Bull, BullMQ), message queues (RabbitMQ, Kafka), serverless

### Response Time
- Gzip compression
- HTTP/2 multiplexing
- Keep-alive connections
- Parallel requests

## Database Performance

### Connection Management
- Connection pooling (reuse)
- Configure pool size
- Monitor usage
- Close idle connections

### Query Performance
**Slow query log**: Identify > 100ms, add indexes, rewrite, consider denormalization

**Pagination**: See sql.md for cursor-based vs offset patterns

### Scaling
**Vertical**: Bigger server (limited)
**Horizontal**: Read replicas (scale reads), sharding (partition data), DB-per-service

## Monitoring

**Frontend**: RUM, synthetic monitoring, Core Web Vitals, error tracking (Sentry)
**Backend**: APM, log aggregation (ELK, Datadog), alerting, distributed tracing

**Continuous**:
1. Set budgets
2. Monitor metrics
3. Alert on regression
4. Profile bottlenecks
5. Optimize
6. Measure impact

## Common Pitfalls

❌ **Premature optimization**: Optimize AFTER measuring, focus on biggest bottlenecks, 80/20 rule
❌ **Over-caching**: Invalidation is hard, stale data bugs, memory limits → Cache stable, expensive data only
❌ **Ignoring network**: Minimize requests, reduce payload, use HTTP/2, consider latency
❌ **Blocking operations**: Never block event loop (Node), use async for I/O, worker threads for CPU tasks
