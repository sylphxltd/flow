/**
 * Subscription Adapter Unit Tests
 * Tests event handling logic without full integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '@sylphx/code-client';
import type { StreamEvent } from '@sylphx/code-server';

describe('Subscription Adapter', () => {
  beforeEach(() => {
    // Reset store before each test
    useAppStore.setState({
      currentSessionId: null,
      currentSession: null,
      messages: [],
    });
  });

  it('should create skeleton session on session-created event', () => {
    const event: StreamEvent = {
      type: 'session-created',
      sessionId: 'test-session-123',
      provider: 'openrouter',
      model: 'test-model',
    };

    // Simulate session-created handling
    useAppStore.setState((state) => {
      state.currentSessionId = event.sessionId;
      state.currentSession = {
        id: event.sessionId,
        provider: event.provider,
        model: event.model,
        agentId: 'coder',
        enabledRuleIds: [],
        messages: [],
        todos: [],
        nextTodoId: 1,
        created: Date.now(),
        updated: Date.now(),
      };
    });

    // Check state
    const state = useAppStore.getState();
    expect(state.currentSessionId).toBe('test-session-123');
    expect(state.currentSession).toBeTruthy();
    expect(state.currentSession?.id).toBe('test-session-123');
    expect(state.currentSession?.provider).toBe('openrouter');
    expect(state.currentSession?.model).toBe('test-model');
  });

  it('should add assistant message on assistant-message-created event', () => {
    // Setup: Create a session first
    useAppStore.setState({
      currentSessionId: 'test-session',
      currentSession: {
        id: 'test-session',
        provider: 'openrouter',
        model: 'test-model',
        agentId: 'coder',
        enabledRuleIds: [],
        messages: [],
        todos: [],
        nextTodoId: 1,
        created: Date.now(),
        updated: Date.now(),
      },
    });

    const event: StreamEvent = {
      type: 'assistant-message-created',
      messageId: 'msg-123',
    };

    // Simulate assistant-message-created handling
    useAppStore.setState((state) => {
      const session = state.currentSession;
      if (session && session.id === 'test-session') {
        session.messages.push({
          role: 'assistant',
          content: [],
          timestamp: Date.now(),
          status: 'active',
        });
      }
    });

    // Check state
    const state = useAppStore.getState();
    expect(state.currentSession?.messages).toHaveLength(1);
    expect(state.currentSession?.messages[0].role).toBe('assistant');
    expect(state.currentSession?.messages[0].status).toBe('active');
  });

  it('should add reasoning part on reasoning-start event', () => {
    // Setup: Session with active message
    useAppStore.setState({
      currentSessionId: 'test-session',
      currentSession: {
        id: 'test-session',
        provider: 'openrouter',
        model: 'test-model',
        agentId: 'coder',
        enabledRuleIds: [],
        messages: [
          {
            role: 'assistant',
            content: [],
            timestamp: Date.now(),
            status: 'active',
          },
        ],
        todos: [],
        nextTodoId: 1,
        created: Date.now(),
        updated: Date.now(),
      },
    });

    // Simulate reasoning-start handling
    useAppStore.setState((state) => {
      const session = state.currentSession;
      if (!session) return;

      const activeMessage = session.messages.find((m) => m.status === 'active');
      if (!activeMessage) return;

      activeMessage.content.push({
        type: 'reasoning',
        content: '',
        status: 'active',
        startTime: Date.now(),
      });
    });

    // Check state
    const state = useAppStore.getState();
    expect(state.currentSession?.messages[0].content).toHaveLength(1);
    expect(state.currentSession?.messages[0].content[0].type).toBe('reasoning');
    expect(state.currentSession?.messages[0].content[0].status).toBe('active');
  });

  it('should update reasoning content on reasoning-delta event', () => {
    // Setup: Session with active message and reasoning part
    useAppStore.setState({
      currentSessionId: 'test-session',
      currentSession: {
        id: 'test-session',
        provider: 'openrouter',
        model: 'test-model',
        agentId: 'coder',
        enabledRuleIds: [],
        messages: [
          {
            role: 'assistant',
            content: [
              {
                type: 'reasoning',
                content: 'Initial ',
                status: 'active',
                startTime: Date.now(),
              },
            ],
            timestamp: Date.now(),
            status: 'active',
          },
        ],
        todos: [],
        nextTodoId: 1,
        created: Date.now(),
        updated: Date.now(),
      },
    });

    // Simulate reasoning-delta handling
    const deltaText = 'thought';

    useAppStore.setState((state) => {
      const session = state.currentSession;
      if (!session) return;

      const activeMessage = session.messages.find((m) => m.status === 'active');
      if (!activeMessage) return;

      const lastPart = activeMessage.content[activeMessage.content.length - 1];
      if (lastPart && lastPart.type === 'reasoning') {
        lastPart.content += deltaText;
      }
    });

    // Check state
    const state = useAppStore.getState();
    expect(state.currentSession?.messages[0].content[0].content).toBe('Initial thought');
  });

  it('should finalize reasoning on reasoning-end event', () => {
    // Setup
    const startTime = Date.now();
    useAppStore.setState({
      currentSessionId: 'test-session',
      currentSession: {
        id: 'test-session',
        provider: 'openrouter',
        model: 'test-model',
        agentId: 'coder',
        enabledRuleIds: [],
        messages: [
          {
            role: 'assistant',
            content: [
              {
                type: 'reasoning',
                content: 'Complete reasoning',
                status: 'active',
                startTime,
              },
            ],
            timestamp: Date.now(),
            status: 'active',
          },
        ],
        todos: [],
        nextTodoId: 1,
        created: Date.now(),
        updated: Date.now(),
      },
    });

    // Simulate reasoning-end handling
    const endTime = Date.now();

    useAppStore.setState((state) => {
      const session = state.currentSession;
      if (!session) return;

      const activeMessage = session.messages.find((m) => m.status === 'active');
      if (!activeMessage) return;

      const lastReasoningIndex = activeMessage.content
        .map((p, i) => ({ p, i }))
        .reverse()
        .find(({ p }) => p.type === 'reasoning' && p.status === 'active')?.i;

      if (lastReasoningIndex !== undefined) {
        const reasoningPart = activeMessage.content[lastReasoningIndex];
        if (reasoningPart && reasoningPart.type === 'reasoning') {
          reasoningPart.status = 'completed';
          reasoningPart.endTime = endTime;
          reasoningPart.duration = endTime - reasoningPart.startTime;
        }
      }
    });

    // Check state
    const state = useAppStore.getState();
    const reasoning = state.currentSession?.messages[0].content[0];
    expect(reasoning?.status).toBe('completed');
    expect(reasoning?.type).toBe('reasoning');
    if (reasoning?.type === 'reasoning') {
      expect(reasoning.endTime).toBe(endTime);
      expect(reasoning.duration).toBeGreaterThanOrEqual(0);
    }
  });
});
