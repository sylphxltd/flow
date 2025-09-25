# Performance Budgets & Caching

Budgets (initial render, mid-tier device)
- LCP < 2.5s, TTI < 3.5s, CLS < 0.1
- JS: < 170KB gzip per route (above-the-fold)
- Images: responsive sizes, modern formats (AVIF/WebP)

Next.js
- Route segment caching; ISR/SSG where applicable
- Avoid blocking server components; stream where possible
- Prefetch critical routes; edge where beneficial

API
- tRPC: pagination, cursor-based; cacheable GETs with SWR
- Redis cache for hot summaries; cache bust on mutations

