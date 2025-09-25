# Realtime & Playback (SSE/WS + Redis Pub/Sub + Streams)

Scope
- Defines live realtime updates (notifications, dashboards, activity indicators) and event playback (time-travel/session replay) using Redis Pub/Sub and Redis Streams.
- Applies to Next.js App Router (serverless), tRPC BFF, Upstash Redis.

Goals
- Live-first UX: immediate UI updates with optimistic states and eventual consistency.
- Deterministic playback: reproducible, idempotent, ordered events for audits and analytics.
- Robust connections: seamless reconnect, backpressure handling, and auth enforcement.
- Serverless-friendly: low memory footprint and stateless handlers.

Transports
- Primary: Server-Sent Events (SSE)
  - Advantages: simple, HTTP-friendly, no extra handshake, great for serverless.
  - One-way push; client sends commands via tRPC mutations.
- Optional: WebSocket (if required for duplex interactions)
  - Use only if domain needs bi-directional low-latency streams (e.g., collaborative cursors).
- Fallback: Polling (rare; used only when network blocks SSE/WS)

Channels and Topics
- Pub/Sub (Live)
  - notifications:user:{userId}
  - admin:dashboard:kpis
  - support:tickets:{ticketId} (agent/user updates)
  - wallet:ledger:{userId}
  - referral:events:{userId}
- Streams (Playback)
  - stream:wallet (ledger and accounting events)
  - stream:auth (login activity, session rotations)
  - stream:referral (click → signup → first_charge → reward)
  - stream:notifications (for auditing deliveries)
  - stream:support (ticket message history)

Event Model

Envelope (all events)
- id: string (ULID/KSUID; time-sortable)
- type: string (domain.event)
- ts: number (ms since epoch)
- actor?: { id: string; kind: 'user'|'system'|'admin' }
- entity?: { type: string; id: string }
- data: unknown (typed per domain)
- correlationId?: string (request/operation boundary)
- version: number (schema version)

Examples
- notifications.delivered
  - data: { notificationId, userId, title, kind }
- wallet.debited
  - data: { userId, amountUsd, reason, operationId, balanceAfter }
- referral.rewardGranted
  - data: { referrerId, amountUsd, eventId, programId }
- support.messageCreated
  - data: { ticketId, sender, text }

Live (Pub/Sub) Semantics
- Publish to topic on state change (e.g., after DB commit).
- Clients subscribe via SSE to multiplexed topics server-side; server fans-in topics to a single SSE stream per client.
- At-most-once UI handling with idempotent UI reducers keyed by event.id to avoid double UI application.

Playback (Streams) Semantics
- Append-only Redis Streams per domain. Keys:
  - stream:{domain} with MAXLEN trimming to a sensible window (e.g., 30–90 days) depending on compliance.
- Consumers
  - Admin analytics: read ranges (XRANGE) with filters by ts or entity id.
  - Session playback: XRANGE from last seen ID; enable resume after reconnect.
- Idempotency
  - Consumer maintains lastSeenId per entity or per user channel; no double-processing on retried batches.

Authentication & Authorization
- Client auth
  - SSE connection authenticated with JWT (Auth.js); token validated server-side on connect and periodically (rotation friendly).
- Authorization checks per topic
  - Only own topics (userId-bound) or admin topics if role=admin.
- Rotation and revocation
  - Redis denylist for JWT (logout/compromised). Server disconnects SSE on denylist match.

Backpressure & Reconnect
- Buffer
  - Server buffers small queue per connection; drop-old policy with signal to client if overflow (client initiates catch-up via Streams).
- Reconnect
  - Exponential backoff 0.5s → 2s, jitter. Client sends Last-Event-ID when reconnecting to avoid gaps.
- Heartbeats
  - Send keep-alive events every ~15–25s to keep connections from idling out (especially behind proxies).

Client UX Patterns
- Notification Center
  - Subscribe to notifications:user:{id}. Update unread counts in Zustand store. Badge reflects unread length; mark read pushes command via tRPC.
- Admin Dashboard
  - Subscribe to admin:dashboard:kpis; batch UI updates at 500–1000ms intervals to avoid thrash; show “live” indicator.
- Wallet
  - On wallet:ledger:{id} debit/credit: animate balance change; append to history with optimistic reconciliation.
- Support
  - Ticket detail subscribes to support:tickets:{ticketId}; autoscroll on new messages unless user scrolled up (show “New messages” toast).
- Presence/Typing (optional, WS)
  - Use WS only if required; otherwise do not implement presence for P0.

Server Handlers (Serverless)
- Route: /api/realtime (SSE)
  - Validates JWT, determines topics for user, establishes Redis PubSub subscription.
  - Multiplex topics → single SSE stream.
  - Heartbeats, close on error/timeout/revocation.
- tRPC commands mutate state and publish events post-commit.
- Playback endpoints
  - /api/playback/{domain}?from=…&to=…&entity=… returning XRANGE slices (guarded, rate-limited).

Performance & Limits
- Message size: keep payload small; IDs, minimal projections. Clients fetch heavy details separately on demand.
- Batch updates in UI: use requestAnimationFrame or micro-batching in Zustand actions.
- Trimming Streams: MAXLEN ~ 1–5 million entries per critical stream (cost-dependent).
- Retry policy: publisher retries transient Redis errors with exponential backoff; ensure at-least-once append to stream.

Testing
- Unit
  - Event envelope schema versions; domain-type validators.
  - Idempotent reducers (same id applied twice → no duplicate UI state).
- Integration
  - Connect/disconnect/reconnect flows; Last-Event-ID resume.
  - Pub/Sub publish → client render under 150–300ms typical.
  - Playback: XRANGE windows and sorting; boundary conditions at page size.
- E2E
  - Wallet top-up: webhook → stream:wallet append → Pub/Sub user balance event → UI balance animates and history updates.
  - Referral first_charge: rewardGranted event visible to referrer in real-time.
  - Support ticket reply: both agent and user see message instantly.

Security
- Rate limits per SSE client (connect attempts) and per playback endpoint.
- Sanitize event data; never leak PII beyond the authorized subject.
- Do not embed secrets/tokens in event payloads.
- CSP: allow connect-src to SSE endpoint and Redis proxy if applicable.

Observability
- Log connect/disconnect with reasons; count active SSE clients.
- Metrics: events/sec per domain; dropped messages; reconnect rates; end-to-end latency p50/p95/p99.
- Alerts: spike in disconnects or dropped messages; stalled publishers.

Cross-References
- Architecture & Platform: ./architecture.md
- Activity Logs: ./activity-logs.md
- Notifications: ./notifications.md
- Security Baseline: ./security.md
- Data Schema (Streams and topics metadata): ./data-schema.md