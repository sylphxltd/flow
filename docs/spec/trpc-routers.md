# tRPC Routers & Contracts

Conventions
- Procedures: public, protected (auth required), admin (role=admin)
- Input: Zod schemas; Output: typed DTOs; never leak DB shapes directly
- Rate limit per procedure; server-only side-effects
- Errors: typed error codes; do not expose internals

Routers (high-level)
- auth: register, login, logout, 2FA, session rotation
- user: getSelf, updateProfile, getPublicProfileByUsername
- account: changeUsername (reserved/cooldown/history), listSessions, revokeSession
- membership: listPlans, subscribePlan, cancel, getStatus
- billing: createTopUpCheckout, listInvoices, getInvoice, previewCharge
- wallet: getBalance, listLedger, charge(operation_id, amount, reason)
- newsletter: subscribe (double opt-in), confirm, unsubscribe
- invite: create, list, revoke, redeem
- referral: getMyLink, regenerateLink, getStats, adminListPrograms, adminUpsertProgram
- notification: list, markRead, preferences get/set, adminBroadcast
- support: createTicket, listMyTickets, reply, adminListTickets, adminReply, assign, close
- audit: adminList
- admin: dashboardKPIs, users search, billing actions, wallet reconcile

DTO Patterns (examples)
- UsernameChangeInput: { newUsername: string } with regex, reserved list check
- ChargeInput: { operationId: string; amountUsd: number; reason: 'feature_x'|'plan_auto_topup'|... }
- ReferralProgramUpsert: policy shape with triggers, caps, window

