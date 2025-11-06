# Ask Tool Client-Server Architecture

## Overview
Design for Ask tool to work in fully separated client-server architecture via tRPC.

## Problem
Current Ask tool uses global handlers (`setUserInputHandler`) which only works in embedded mode (in-process). For client-server architecture (web), we need Ask tool to work via tRPC streaming.

## Architecture

### Flow
```
┌────────┐                    ┌────────┐
│ Client │                    │ Server │
└───┬────┘                    └───┬────┘
    │                             │
    │ streamResponse subscription │
    │────────────────────────────>│
    │                             │
    │                        AI calls Ask tool
    │                             │
    │      ask-question event     │
    │<────────────────────────────│
    │  { questionId, questions }  │
    │                             │
    │     (Server waits...)       │
    │                             │
  User answers                    │
    │                             │
    │  answerAsk mutation         │
    │────────────────────────────>│
    │  { questionId, answers }    │
    │                             │
    │                      Resolve Promise
    │                      Ask tool returns
    │                             │
    │      Stream continues       │
    │<────────────────────────────│
```

### Components

#### 1. Streaming Events (Server → Client)
Add to existing streaming events:

```typescript
{
  type: 'ask-question',
  questionId: string,        // Unique ID for this ask
  questions: Question[]      // Array of questions
}
```

#### 2. Answer Mutation (Client → Server)
New tRPC mutation:

```typescript
message.answerAsk.mutate({
  sessionId: string,
  questionId: string,
  answers: Record<string, string | string[]>
})
```

#### 3. Server-Side Implementation
Ask tool stores pending questions with Promise resolvers:

```typescript
// Global map of pending asks
const pendingAsks = new Map<string, {
  resolve: (answers: Record<string, string | string[]>) => void,
  reject: (error: Error) => void,
  timeout: NodeJS.Timeout
}>();

// In Ask tool
async function askTool(args) {
  const questionId = generateId();

  // Send question to client via streaming
  emitStreamEvent({
    type: 'ask-question',
    questionId,
    questions: args.questions
  });

  // Wait for answer
  const answers = await new Promise((resolve, reject) => {
    // Store resolver
    pendingAsks.set(questionId, {
      resolve,
      reject,
      timeout: setTimeout(() => {
        reject(new Error('Ask timeout'));
        pendingAsks.delete(questionId);
      }, 5 * 60 * 1000) // 5 min timeout
    });
  });

  return { answers };
}

// In answerAsk mutation
async function answerAsk({ questionId, answers }) {
  const pending = pendingAsks.get(questionId);
  if (!pending) {
    throw new Error('Question not found or already answered');
  }

  clearTimeout(pending.timeout);
  pending.resolve(answers);
  pendingAsks.delete(questionId);
}
```

#### 4. Client-Side Implementation
Update `useChat.ts` to handle ask-question events:

```typescript
// Add to SendMessageOptions
export interface SendMessageOptions {
  // ... existing
  onAskQuestion?: (questionId: string, questions: Question[]) => void;
}

// In subscription onData handler
case 'ask-question':
  onAskQuestion?.(event.questionId, event.questions);
  break;
```

Update `useAskToolHandler.ts`:
- Remove global handler approach
- Use callback from useChat instead
- When user answers, call `client.message.answerAsk.mutate()`

## Benefits
1. ✅ Works in client-server architecture (web)
2. ✅ No global state dependencies
3. ✅ Proper separation of concerns
4. ✅ Type-safe via tRPC
5. ✅ Supports multiple concurrent asks (different sessions)

## Migration Path
1. Add streaming event type `ask-question` to server
2. Implement answerAsk mutation
3. Update Ask tool to emit events instead of using global handler
4. Update useChat to handle ask-question events
5. Update useAskToolHandler to use new flow
6. Keep backward compatibility: embedded mode can still use global handlers

## Implementation Files
- `/packages/code-server/src/trpc/routers/message.router.ts` - Add answerAsk mutation
- `/packages/code-server/src/services/stream-handler.ts` - Add ask-question event
- `/packages/code-core/src/tools/interaction.ts` - Add event-based Ask tool
- `/packages/code-client/src/hooks/useChat.ts` - Handle ask-question events
- `/packages/code-client/src/hooks/useAskToolHandler.ts` - Use new architecture
