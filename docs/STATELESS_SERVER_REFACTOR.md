# Stateless Server Architecture Refactor

**Status:** 📋 Planning Phase
**Priority:** 🔴 Critical - Architecture Foundation
**Last Updated:** 2025-01-05

---

## 🎯 Goal

Refactor from **stateful server with global agent state** to **stateless server with per-request parameterization**.

### Current Problem ❌

```typescript
// code-core/src/ai/agent-manager.ts
export function getCurrentAgent(): Agent {
  // Returns GLOBAL current agent from app store
  return store.getState().currentAgentId
}

export function switchAgent(agentId: string): boolean {
  // Mutates GLOBAL state
  store.getState().setCurrentAgentId(agentId)
}

// code-server/src/services/streaming.service.ts
export function streamAIResponse(opts) {
  // Uses global agent - WRONG!
  const agent = getCurrentAgent()
  const systemPrompt = agent.systemPrompt
  // ...
}
```

**Issues:**
1. ❌ Server depends on client state (coupling)
2. ❌ Multi-client confusion (TUI changes agent, Web sees wrong agent)
3. ❌ Not scalable (can't have multiple sessions with different agents)
4. ❌ Violates stateless server principle

---

## ✅ Target Architecture

### Design Principles

```
┌─────────────────────────────────────────────────────────┐
│ Principle 1: Server is STATELESS                        │
│ - All context passed via request parameters              │
│ - No global "current" state                             │
│ - Each session can use any agent/provider/model         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Principle 2: Client manages UI state                    │
│ - Client tracks "selected" agent/provider/model         │
│ - Client passes selections as parameters                │
│ - Full flexibility per client instance                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Principle 3: Session stores configuration               │
│ - Database persists agent/provider/model per session    │
│ - Server reads from session, not global state           │
│ - Each session independent                              │
└─────────────────────────────────────────────────────────┘
```

### New Flow

```typescript
// ✅ CLIENT (TUI/Web)
const client = useTRPC()
const [selectedAgentId, setSelectedAgentId] = useState('coder')

// Client manages its own state
function handleAgentChange(newAgentId: string) {
  setSelectedAgentId(newAgentId)
}

// Pass as parameter
client.message.streamResponse.subscribe({
  sessionId: 'session-123',
  agentId: selectedAgentId,      // ✅ Explicit parameter
  provider: 'openrouter',         // ✅ Explicit parameter
  model: 'grok-code-fast-1',      // ✅ Explicit parameter
  userMessage: 'Hello'
})

// ✅ SERVER
export interface StreamAIResponseOptions {
  sessionId: string | null
  agentId?: string               // ✅ Optional: use session default or this
  provider?: string              // ✅ Optional: use session default or this
  model?: string                 // ✅ Optional: use session default or this
  userMessage: string
  attachments?: FileAttachment[]
}

export function streamAIResponse(opts: StreamAIResponseOptions) {
  // Load session from database
  const session = await sessionRepo.getSessionById(opts.sessionId)

  // Use parameters OR session defaults
  const agentId = opts.agentId || session.agentId || DEFAULT_AGENT_ID
  const provider = opts.provider || session.provider
  const model = opts.model || session.model

  // Load agent definition (NO global state)
  const agent = getAgentById(agentId)
  const systemPrompt = agent.systemPrompt

  // Stream response with explicit configuration
  // ...
}

// ✅ CODE-CORE (Pure business logic)
export function getAgentById(id: string): Agent | null {
  // Pure function: load agent definition
  // NO state modification
  return agentMap.get(id)
}

export function getAllAgents(): Agent[] {
  // Pure function: return all available agents
  // NO "current" concept
  return Array.from(agentMap.values())
}

// ❌ REMOVED: switchAgent, getCurrentAgent, setCurrentAgent
```

---

## 📋 Refactoring Plan

### Phase 1: Update Database Schema

**File:** `packages/code-core/src/database/schema.ts`

```typescript
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),

  // Add agent configuration (NEW)
  agentId: text('agent_id').default('coder'),

  // Existing fields
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  title: text('title'),
  // ...
})
```

**Migration:** Drizzle auto-migration will add `agentId` column with default value.

---

### Phase 2: Refactor code-core (Pure Logic Layer)

**File:** `packages/code-core/src/ai/agent-manager.ts`

**Remove:**
- ❌ `getCurrentAgent()`
- ❌ `getCurrentAgentId()`
- ❌ `switchAgent()`
- ❌ `setAppStoreGetter()` - No more coupling to client store

**Keep:**
- ✅ `initializeAgentManager(cwd)` - Load agents from disk
- ✅ `getAllAgents()` - Return all available agents
- ✅ `getAgentById(id)` - Load specific agent by ID
- ✅ `reloadAgents()` - Reload from disk

**File:** `packages/code-core/src/index.ts`

```diff
export {
  initializeAgentManager,
-  setAppStoreGetter,
  getAllAgents,
  getAgentById,
-  getCurrentAgent,
-  getCurrentAgentId,
-  switchAgent,
-  getCurrentSystemPrompt
} from './ai/agent-manager.js'

+ // NEW: Build system prompt from agent
+ export { buildSystemPrompt } from './ai/system-prompt-builder.js'
```

**New File:** `packages/code-core/src/ai/system-prompt-builder.ts`

```typescript
/**
 * Build complete system prompt from agent definition
 * Pure function - no global state
 */
export function buildSystemPrompt(agentId: string): string {
  const agent = getAgentById(agentId) || getAgentById(DEFAULT_AGENT_ID)

  // Load enabled rules
  const rules = getEnabledRules()
  const rulesContent = rules.map(r => r.content).join('\n\n')

  // Combine agent prompt + rules
  return `${agent.systemPrompt}\n\n${rulesContent}`
}
```

---

### Phase 3: Update tRPC API

**File:** `packages/code-server/src/trpc/routers/message.router.ts`

```diff
export const messageRouter = router({
  streamResponse: publicProcedure
    .input(
      z.object({
        sessionId: z.string().nullable(),
+       agentId: z.string().optional(),  // NEW
        provider: z.string().optional(),
        model: z.string().optional(),
        userMessage: z.string(),
        attachments: z.array(fileAttachmentSchema).optional(),
      })
    )
    .subscription(async ({ input, ctx }) => {
      return streamAIResponse({
        sessionRepository: ctx.sessionRepository,
        aiConfig: ctx.aiConfig,
        sessionId: input.sessionId,
+       agentId: input.agentId,           // NEW
        provider: input.provider,
        model: input.model,
        userMessage: input.userMessage,
        attachments: input.attachments,
      })
    }),
})
```

---

### Phase 4: Update Streaming Service

**File:** `packages/code-server/src/services/streaming.service.ts`

```diff
export interface StreamAIResponseOptions {
  sessionRepository: SessionRepository
  aiConfig: AIConfig
  sessionId: string | null
+ agentId?: string                  // NEW
  provider?: string
  model?: string
  userMessage: string
  attachments?: FileAttachment[]
  abortSignal?: AbortSignal
}

export function streamAIResponse(opts: StreamAIResponseOptions) {
  return observable<StreamEvent>((observer) => {
    (async () => {
      // ... session loading logic ...

      const session = await sessionRepository.getSessionById(sessionId)

      // Determine agent to use
+     const agentId = opts.agentId || session.agentId || DEFAULT_AGENT_ID
+     const agent = getAgentById(agentId)
+
+     if (!agent) {
+       observer.next({
+         type: 'error',
+         error: `Agent '${agentId}' not found`
+       })
+       observer.complete()
+       return
+     }

      // Build system prompt
-     const systemPrompt = getCurrentSystemPrompt()  // OLD - global state
+     const systemPrompt = buildSystemPrompt(agentId) // NEW - explicit

      // ... rest of streaming logic ...
    })()
  })
}
```

---

### Phase 5: Update Session Repository

**File:** `packages/code-core/src/database/session-repository.ts`

```diff
export class SessionRepository {
  async createSession(
    provider: ProviderId,
    model: string,
+   agentId?: string
  ): Promise<Session> {
    const sessionId = generateId()

    await this.db.insert(sessions).values({
      id: sessionId,
      provider,
      model,
+     agentId: agentId || DEFAULT_AGENT_ID,
      title: `New Chat - ${new Date().toLocaleString()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    return this.getSessionById(sessionId)
  }

  async updateSession(
    sessionId: string,
-   updates: { title?: string }
+   updates: { title?: string; agentId?: string; provider?: string; model?: string }
  ): Promise<void> {
    await this.db
      .update(sessions)
      .set({
        ...updates,
        updatedAt: Date.now(),
      })
      .where(eq(sessions.id, sessionId))
  }
}
```

---

### Phase 6: Update code-client State Management

**File:** `packages/code-client/src/store/app-store.ts`

```diff
interface AppState {
  // UI State (client-side only)
+ selectedAgentId: string           // NEW: Client UI state
+ selectedProvider: string          // NEW: Client UI state
+ selectedModel: string             // NEW: Client UI state

- currentAgentId: string            // REMOVE: No "current" concept

  // Actions
+ setSelectedAgent: (agentId: string) => void
+ setSelectedProvider: (provider: string) => void
+ setSelectedModel: (model: string) => void

- setCurrentAgentId: (agentId: string) => void  // REMOVE
}

export const useAppStore = create<AppState>((set) => ({
+ selectedAgentId: 'coder',
+ selectedProvider: 'openrouter',
+ selectedModel: 'x-ai/grok-code-fast-1',

+ setSelectedAgent: (agentId) => set({ selectedAgentId: agentId }),
+ setSelectedProvider: (provider) => set({ selectedProvider: provider }),
+ setSelectedModel: (model) => set({ selectedModel: model }),
}))
```

**File:** `packages/code-client/src/hooks/useChat.ts`

```diff
export function useChat(sessionId: string | null) {
  const client = useTRPCClient()
+ const selectedAgentId = useAppStore((s) => s.selectedAgentId)
+ const selectedProvider = useAppStore((s) => s.selectedProvider)
+ const selectedModel = useAppStore((s) => s.selectedModel)

  function sendMessage(content: string, attachments?: FileAttachment[]) {
    client.message.streamResponse.subscribe({
      sessionId,
+     agentId: selectedAgentId,      // Pass client selection
+     provider: selectedProvider,     // Pass client selection
+     model: selectedModel,           // Pass client selection
      userMessage: content,
      attachments,
    })
  }

  return { sendMessage }
}
```

---

### Phase 7: Update TUI Dashboard

**File:** `packages/code/src/screens/Dashboard.tsx`

```diff
export default function Dashboard() {
- const { currentAgentId, setCurrentAgentId } = useAppStore()
+ const { selectedAgentId, setSelectedAgent } = useAppStore()
- const agents = getAllAgents()
+ const { data: agents } = useQuery({
+   queryKey: ['agents'],
+   queryFn: async () => {
+     const core = await import('@sylphx/code-core')
+     return core.getAllAgents()
+   }
+ })

  function handleAgentSelect(agentId: string) {
-   switchAgent(agentId)             // OLD: Mutate global state
+   setSelectedAgent(agentId)        // NEW: Update client UI state
  }

  return (
    <Box flexDirection="column">
      <Text bold>Select Agent:</Text>
      {agents.map((agent) => (
        <SelectableItem
          key={agent.id}
          label={agent.metadata.name}
-         selected={agent.id === currentAgentId}
+         selected={agent.id === selectedAgentId}
          onSelect={() => handleAgentSelect(agent.id)}
        />
      ))}
    </Box>
  )
}
```

---

### Phase 8: Update Web GUI

**File:** `packages/code-web/src/components/AgentSelector.tsx`

Same pattern as TUI - use client state instead of calling switchAgent.

---

## ✅ Testing Strategy

### Test Cases

1. **Multi-Session Independence**
   ```typescript
   // Session 1: Coder agent + OpenRouter + GPT-4
   // Session 2: Reviewer agent + Anthropic + Claude
   // Verify: Each session maintains its own configuration
   ```

2. **Multi-Client Independence**
   ```bash
   # Terminal 1: TUI selects "Coder" agent
   # Browser: Web selects "Reviewer" agent
   # Verify: Each client sees its own selection
   ```

3. **Session Persistence**
   ```typescript
   // Create session with agent X
   // Close client
   // Reopen client
   // Load session
   // Verify: Session still uses agent X
   ```

4. **Parameter Override**
   ```typescript
   // Session default: Coder agent
   // Request with agentId: "reviewer"
   // Verify: Uses "reviewer" for this message only
   ```

---

## 📊 Impact Analysis

### Files Modified

**Code-Core (SDK):**
- ✏️ `src/ai/agent-manager.ts` - Remove state management
- ✏️ `src/index.ts` - Update exports
- ➕ `src/ai/system-prompt-builder.ts` - New pure function
- ✏️ `src/database/schema.ts` - Add agentId to sessions
- ✏️ `src/database/session-repository.ts` - Add agentId parameter

**Code-Server (Service):**
- ✏️ `src/trpc/routers/message.router.ts` - Add agentId input
- ✏️ `src/services/streaming.service.ts` - Use parameter instead of global

**Code-Client (Shared):**
- ✏️ `src/store/app-store.ts` - Change to "selected" not "current"
- ✏️ `src/hooks/useChat.ts` - Pass client selections

**Code (TUI):**
- ✏️ `src/screens/Dashboard.tsx` - Use client state
- ✏️ `src/headless.ts` - Pass agentId parameter

**Code-Web (GUI):**
- ✏️ `src/components/AgentSelector.tsx` - Use client state
- ✏️ `src/components/ProviderSelector.tsx` - Use client state
- ✏️ `src/components/ModelSelector.tsx` - Use client state

### Breaking Changes

❌ **Public API Changes:**
- `switchAgent()` removed from code-core
- `getCurrentAgent()` removed from code-core
- `getCurrentAgentId()` removed from code-core
- `setAppStoreGetter()` removed from code-core

✅ **Migration Path:**
```typescript
// OLD
import { switchAgent, getCurrentAgent } from '@sylphx/code-core'
switchAgent('reviewer')
const agent = getCurrentAgent()

// NEW
import { getAgentById } from '@sylphx/code-core'
// In client: manage UI state
setSelectedAgent('reviewer')
// In server: use parameter
const agent = getAgentById(opts.agentId)
```

---

## 🎯 Success Criteria

### Must Have ✅

1. ✅ Server has NO global "current agent" state
2. ✅ Each session stores its agent/provider/model configuration
3. ✅ Client manages "selected" agent in UI state
4. ✅ Multiple sessions can use different agents simultaneously
5. ✅ TUI and Web can have different selections independently
6. ✅ All existing functionality still works
7. ✅ Database migration runs automatically
8. ✅ Tests pass

### Nice to Have 🎁

1. Agent switching within a session (change mid-conversation)
2. Per-message agent override (advanced feature)
3. Agent analytics (which agents used most)
4. Agent recommendations based on task type

---

## 📅 Timeline

**Total Estimate:** 4-6 hours

- Phase 1 (Schema): 30 min
- Phase 2 (Core): 1 hour
- Phase 3 (API): 30 min
- Phase 4 (Service): 1 hour
- Phase 5 (Repository): 30 min
- Phase 6 (Client): 1 hour
- Phase 7 (TUI): 45 min
- Phase 8 (Web): 45 min
- Testing: 1 hour

---

## 🔄 Rollback Plan

If issues arise:

1. **Revert commits:**
   ```bash
   git revert <commit-range>
   ```

2. **Database rollback:**
   - Remove `agentId` column from sessions table
   - Use global agent state temporarily

3. **Client fallback:**
   - Keep old switchAgent/getCurrentAgent (deprecated)
   - Gradually migrate clients

---

## 📝 Next Steps

1. ✅ Review this document
2. ⏭️ Get approval from user
3. ⏭️ Execute Phase 1-8 systematically
4. ⏭️ Test thoroughly
5. ⏭️ Update ARCHITECTURE.md
6. ⏭️ Commit with detailed message
7. ⏭️ Update documentation

---

**Document Status:** Ready for review ✅
**Approval Required:** Yes 🔴
**Start Date:** TBD
