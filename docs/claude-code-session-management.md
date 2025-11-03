# Claude Code Session Management

## Problem

Each call to `ClaudeCodeLanguageModel` creates a new session, causing:
- ❌ Lots of session files created
- ❌ Loss of conversation context

If you reuse sessions but continue sending full history:
- ❌ Message duplication (Claude Code already has history + you send it again)
- ❌ Token waste
- ❌ Confusing responses

## Solution

**Provider automatically tracks sent messages and only sends NEW messages when resuming sessions.**

### How it Works

```
First Call:
┌─────────────────────────────────────┐
│ Vercel AI SDK Messages (you pass)   │
├─────────────────────────────────────┤
│ [0] user: "Hello"                   │  ← All sent to Claude Code
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Claude Code Session (newly created) │
├─────────────────────────────────────┤
│ [0] user: "Hello"                   │
│ [1] assistant: "Hi! How can I help?"│
└─────────────────────────────────────┘
         ↓
Returns: sessionId + messageCount: 1


Second Call:
┌─────────────────────────────────────┐
│ Vercel AI SDK Messages (you pass)   │
├─────────────────────────────────────┤
│ [0] user: "Hello"                   │  ← Skip (already in session)
│ [1] assistant: "Hi! How can I help?"│  ← Skip (already in session)
│ [2] user: "What's the weather?"     │  ← Only send this
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Claude Code Session (reused)        │
├─────────────────────────────────────┤
│ [0] user: "Hello"                   │
│ [1] assistant: "Hi! How can I help?"│
│ [2] user: "What's the weather?"     │  ← Append new message
│ [3] assistant: "I don't have..."    │
└─────────────────────────────────────┘
         ↓
Returns: sessionId + messageCount: 3
```

## Rewind / Edit Detection

**New Feature: Automatically detect message history changes**

Provider now automatically detects:
- ✅ **Rewind**: Message count decreased (user deleted messages)
- ✅ **Edit**: Previously sent message content was modified
- ✅ **Auto-handle**: Creates new session when inconsistency detected

### How it Works

```typescript
// First call
messages = [
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi!' },
  { role: 'user', content: 'Wrong question' }
]
// → sessionId=123, messageCount=3, fingerprints=["user:Hello", "assistant:Hi!", "user:Wrong question"]

// User rewinds and edits
messages = [
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi!' },
  { role: 'user', content: 'Right question' }  // ← Content changed!
]

// Provider automatically detects inconsistency:
// - fingerprints[2] changed from "user:Wrong question" to "user:Right question"
// - Automatically ignores old sessionId, creates new session
// - Returns warning to notify you
```

### Detection Results

When inconsistency detected:
- ❌ Old sessionId ignored
- ✅ New Claude Code session created automatically
- ⚠️ Returns warning: `"Message history inconsistency detected..."`
- 📊 Header includes: `x-claude-code-session-forced-new: "true"`

### Usage

#### Option A: Track messageCount + fingerprints (Recommended)

```typescript
import { generateText } from 'ai';
import { claudeCode } from 'your-provider';

// Store session info
let sessionId: string | undefined;
let messageCount = 0;

// First call
const result1 = await generateText({
  model: claudeCode('sonnet'),
  messages: [{ role: 'user', content: 'Hello' }]
});

// Extract session info
sessionId = result1.response.headers['x-claude-code-session-id'];
messageCount = parseInt(result1.response.headers['x-claude-code-message-count'] || '0');
const fingerprints = JSON.parse(result1.response.headers['x-claude-code-message-fingerprints'] || '[]');

// Second call - reuses session
const result2 = await generateText({
  model: claudeCode('sonnet'),
  messages: [
    { role: 'user', content: 'Hello' },              // Already in Claude Code
    { role: 'assistant', content: 'Hi! How...' },    // Already in Claude Code
    { role: 'user', content: 'What is 2+2?' }        // New message - will be sent
  ],
  providerOptions: {
    'claude-code': {
      sessionId: sessionId,                       // Reuse session
      lastProcessedMessageCount: messageCount,    // Skip first N messages
      messageFingerprints: fingerprints           // Detect rewind/edit
    }
  }
});

// Check if new session was created due to inconsistency
if (result2.warnings?.length > 0) {
  console.log('⚠️ Warning:', result2.warnings[0]);
  // "Message history inconsistency detected (rewind or edit). Created new Claude Code session."
}

// Update session info
sessionId = result2.response.headers['x-claude-code-session-id'];  // May be new session
messageCount = parseInt(result2.response.headers['x-claude-code-message-count'] || '0');
const newFingerprints = JSON.parse(result2.response.headers['x-claude-code-message-fingerprints'] || '[]');
```

#### Option B: Without messageCount tracking (Fallback)

If you don't pass `lastProcessedMessageCount`, provider uses fallback logic:
- Only sends last user message + any tool results after it
- Relatively safe, but may lose some context

```typescript
// Second call - no messageCount
const result2 = await generateText({
  model: claudeCode('sonnet'),
  messages: [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi!' },
    { role: 'user', content: 'What is 2+2?' }  // Only this will be sent
  ],
  providerOptions: {
    'claude-code': {
      sessionId: sessionId  // Only pass sessionId
    }
  }
});
```

#### Streaming Example

```typescript
import { streamText } from 'ai';

const result = await streamText({
  model: claudeCode('sonnet'),
  messages: [{ role: 'user', content: 'Hello' }]
});

let sessionId: string | undefined;
let messageCount = 0;

for await (const chunk of result.fullStream) {
  if (chunk.type === 'text-delta') {
    process.stdout.write(chunk.textDelta);
  } else if (chunk.type === 'finish') {
    // Extract session info
    const metadata = chunk.providerMetadata?.['claude-code'];
    sessionId = metadata?.sessionId;
    messageCount = metadata?.messageCount || 0;
    const fingerprints = metadata?.messageFingerprints || [];

    // Check if new session was created due to inconsistency
    if (metadata?.forcedNewSession) {
      console.log('⚠️ Message history changed, created new session');
    }
  }
}

// Use sessionId + messageCount for next call
```

## Important Notes

### ✅ Best Practices

1. **Always pass full message history to Vercel AI SDK**
   - Provider automatically filters already-sent messages

2. **Save and pass three tracking fields**
   - `sessionId`: Claude Code session identifier
   - `messageCount`: Number of messages already sent
   - `messageFingerprints`: Message fingerprint array (for rewind/edit detection)

3. **One Vercel session → One Claude Code session**
   - Don't reuse sessionId across different conversations

4. **Check warnings and forcedNewSession**
   - If inconsistency detected, provider creates new session
   - Update your stored sessionId

### ❌ Anti-Patterns

1. **Manually trimming message history**
   ```typescript
   // ❌ Wrong - don't do this
   const result = await generateText({
     messages: [lastMessage],  // Only pass last message
     providerOptions: { 'claude-code': { sessionId } }
   });
   ```

2. **Forgetting messageCount or fingerprints**
   ```typescript
   // ⚠️ Works but not ideal
   const result = await generateText({
     messages: fullHistory,
     providerOptions: {
       'claude-code': {
         sessionId,  // Missing messageCount and fingerprints
       }
     }
   });
   // Consequences:
   // - No messageCount: Uses fallback (only sends last user message)
   // - No fingerprints: Cannot detect rewind/edit
   ```

3. **Reusing sessionId across different conversations**
   ```typescript
   // ❌ Wrong - will confuse conversations
   const session1 = await chat1();  // About weather
   const session2 = await chat2({   // About math
     providerOptions: {
       'claude-code': { sessionId: session1.sessionId }  // Wrong!
     }
   });
   ```

## Implementation Details

### Provider Internal Logic

```typescript
private convertMessagesToString(options, isResuming: boolean) {
  const messages = options.prompt;
  const providerOptions = options.providerOptions?.['claude-code'];
  const lastProcessedCount = providerOptions?.lastProcessedMessageCount;
  const lastFingerprints = providerOptions?.messageFingerprints;

  // Step 1: Detect inconsistency
  let shouldForceNewSession = false;
  if (isResuming && lastProcessedCount !== undefined) {
    // Detect rewind (message count decreased)
    if (messages.length < lastProcessedCount) {
      shouldForceNewSession = true;
    }
    // Detect edit (message content changed)
    if (lastFingerprints) {
      for (let i = 0; i < lastProcessedCount; i++) {
        const currentFingerprint = getMessageFingerprint(messages[i]);
        if (currentFingerprint !== lastFingerprints[i]) {
          shouldForceNewSession = true;
          break;
        }
      }
    }
  }

  // Step 2: Decide which messages to send
  let messagesToProcess = messages;
  if (isResuming && !shouldForceNewSession) {
    if (lastProcessedCount !== undefined) {
      // Skip already processed messages
      messagesToProcess = messages.slice(lastProcessedCount);
    } else {
      // Fallback: only send last user message + tool results
      const lastUserIndex = messages.findLastIndex(m => m.role === 'user');
      messagesToProcess = messages.slice(lastUserIndex);
    }
  }

  // Step 3: Generate new fingerprints
  const messageFingerprints = messages.map(msg => getMessageFingerprint(msg));

  return { prompt, shouldForceNewSession, messageFingerprints };
}
```

## Session Storage Location

Claude Code CLI stores sessions at:
```
~/.claude/sessions/<session-id>.json
```

You can view all sessions using the `claude` CLI:
```bash
claude sessions list
```

## Summary

✅ **What you need to do**:
1. Save `sessionId`, `messageCount`, and `messageFingerprints`
2. Pass them back on next call
3. Always pass full message history
4. Check warnings (optional, to know if new session was created)

✅ **What provider does automatically**:
1. Detects if resuming session
2. Detects if message history was modified (rewind/edit)
3. Creates new session if inconsistency detected
4. Filters already-sent messages
5. Only sends new messages to Claude Code
6. Returns updated tracking info

🎉 **Results**:
- ✅ Won't create multiple sessions
- ✅ No message duplication
- ✅ Conversation context maintained correctly
- ✅ Rewind/Edit handled automatically, no manual intervention needed
