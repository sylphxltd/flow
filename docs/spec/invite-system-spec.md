# Invite System Specifications

## Purpose
Defines the invite mechanism for user acquisition, allowing users to generate limited-use codes for friends. Integrated with auth and referrals. Anti-abuse via limits and audits. Current gaps: No invite table; missing generation/validation logic; no expiry handling.

## 1. Core Model
- **Invite Types**: Personal (user-generated, limited uses) and Global (admin-created for campaigns).
- **Limits**: Per-user: 5 active invites; uses per code: 1-10 (configurable); expiry: 30 days default.
- **Flow**: Generate code → Share → Friend signs up with code → Credit referrer (e.g., +1 invite slot) → Notify.

## 2. User Experience
- **Generation** (/account/invites): Button to create new code; list active/used (code, uses left, expiry, accepted by).
- **Usage**: During signup, optional code field; auto-apply if provided; validation on submit.
- **Stats**: Number of invites sent/accepted; rewards if tied to referral (e.g., wallet credit on acceptance).

## 3. Admin Management (/admin/invites)
- **Global Codes**: Create/revoke; set uses/expiry; usage stats (per code, acceptance rate).
- **Overview**: Total invites, acceptance rate; filter by user/code.

## 4. Data Layer
- **Schemas**: invites (id, creator_id, code, uses_max, uses_used, expires_at, created_at); invite_uses (id, invite_id, user_id, used_at).
- **Validation**: Unique codes; check expiry/uses in tRPC signup procedure.

## 5. Integration and Anti-Abuse
- **Triggers**: On acceptance → notification, audit log, optional reward.
- **Abuse Prevention**: Rate limit generation (3/day); IP check for self-invites; admin revoke for spam.
- **Consent**: Invites respect privacy (no email harvesting).

## 6. Flows and Gaps
- **Key Flow**: Create invite → Friend signup with code → Validate → Log use.
- **Missing**: invites schema; tRPC procedures (createInvite, redeemInvite); expiry cron job.
- **Testing**: E2E for generation → redemption → limit enforcement.

This spec enables controlled user growth: simple, trackable, secure. Prioritize schema and validation for launch.