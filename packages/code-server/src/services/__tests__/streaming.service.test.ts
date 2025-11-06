/**
 * Streaming Service Unit Tests
 * Tests core streaming logic without full integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { streamAIResponse } from '../streaming.service.js';
import type { AppContext } from '../../context.js';
import type { SessionRepository, AIConfig } from '@sylphx/code-core';

// Mock dependencies
const mockSessionRepository: Partial<SessionRepository> = {
  createSession: vi.fn(),
  getSessionById: vi.fn(),
  addMessage: vi.fn(),
  updateMessageParts: vi.fn(),
  updateMessageStatus: vi.fn(),
  updateMessageUsage: vi.fn(),
  updateSession: vi.fn(),
};

const mockAppContext: Partial<AppContext> = {
  database: {
    getRepository: () => mockSessionRepository as SessionRepository,
  } as any,
  agentManager: {
    getAll: () => [],
  } as any,
  ruleManager: {
    getEnabled: () => [],
  } as any,
};

const mockAIConfig: AIConfig = {
  providers: {
    openrouter: {
      apiKey: 'test-key',
      baseUrl: 'https://openrouter.ai/api/v1',
    },
  },
  defaultProvider: 'openrouter',
  defaultModel: 'test-model',
};

describe('Streaming Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Session Creation', () => {
    it('should create new session when sessionId is null', async () => {
      // Setup mocks
      const mockSession = {
        id: 'session-123',
        provider: 'openrouter',
        model: 'test-model',
        agentId: 'coder',
        enabledRuleIds: [],
        messages: [],
        todos: [],
        nextTodoId: 1,
        created: Date.now(),
        updated: Date.now(),
      };

      (mockSessionRepository.createSession as any).mockResolvedValue(mockSession);
      (mockSessionRepository.getSessionById as any).mockResolvedValue(mockSession);
      (mockSessionRepository.addMessage as any).mockResolvedValue('msg-123');

      // Create observable
      const observable = streamAIResponse({
        appContext: mockAppContext as AppContext,
        sessionRepository: mockSessionRepository as SessionRepository,
        aiConfig: mockAIConfig,
        sessionId: null,
        provider: 'openrouter',
        model: 'test-model',
        userMessage: 'test',
      });

      // Collect events
      const events: string[] = [];

      await new Promise<void>((resolve) => {
        observable.subscribe({
          next: (event) => {
            events.push(event.type);
            if (event.type === 'session-created') {
              expect(event.sessionId).toBe('session-123');
              expect(event.provider).toBe('openrouter');
              expect(event.model).toBe('test-model');
            }
            if (event.type === 'error' || event.type === 'complete') {
              resolve();
            }
          },
          error: () => resolve(),
          complete: () => resolve(),
        });
      });

      // Verify session was created
      expect(mockSessionRepository.createSession).toHaveBeenCalledWith(
        'openrouter',
        'test-model',
        'coder'
      );
      expect(events).toContain('session-created');
    });

    it('should reject when provider/model missing for new session', async () => {
      const observable = streamAIResponse({
        appContext: mockAppContext as AppContext,
        sessionRepository: mockSessionRepository as SessionRepository,
        aiConfig: mockAIConfig,
        sessionId: null,
        userMessage: 'test',
      });

      const events: any[] = [];

      await new Promise<void>((resolve) => {
        observable.subscribe({
          next: (event) => events.push(event),
          error: () => resolve(),
          complete: () => resolve(),
        });
      });

      // Should not create session
      expect(mockSessionRepository.createSession).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should emit error event when provider not configured', async () => {
      const mockSession = {
        id: 'session-123',
        provider: 'invalid-provider',
        model: 'test-model',
        agentId: 'coder',
        enabledRuleIds: [],
        messages: [],
        todos: [],
        nextTodoId: 1,
        created: Date.now(),
        updated: Date.now(),
      };

      (mockSessionRepository.getSessionById as any).mockResolvedValue(mockSession);

      const observable = streamAIResponse({
        appContext: mockAppContext as AppContext,
        sessionRepository: mockSessionRepository as SessionRepository,
        aiConfig: mockAIConfig,
        sessionId: 'session-123',
        userMessage: 'test',
      });

      const events: any[] = [];

      await new Promise<void>((resolve) => {
        observable.subscribe({
          next: (event) => {
            events.push(event);
            if (event.type === 'error' || event.type === 'complete') {
              resolve();
            }
          },
          error: () => resolve(),
          complete: () => resolve(),
        });
      });

      // Should emit error event
      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThan(0);
    });

    it('should handle session not found', async () => {
      (mockSessionRepository.getSessionById as any).mockResolvedValue(null);

      const observable = streamAIResponse({
        appContext: mockAppContext as AppContext,
        sessionRepository: mockSessionRepository as SessionRepository,
        aiConfig: mockAIConfig,
        sessionId: 'nonexistent',
        userMessage: 'test',
      });

      let errorCaught = false;

      await new Promise<void>((resolve) => {
        observable.subscribe({
          next: () => {},
          error: () => {
            errorCaught = true;
            resolve();
          },
          complete: () => resolve(),
        });
      });

      expect(errorCaught).toBe(true);
    });
  });

  describe('Message Context Building', () => {
    it('should add system status to user messages', async () => {
      const mockSession = {
        id: 'session-123',
        provider: 'openrouter',
        model: 'test-model',
        agentId: 'coder',
        enabledRuleIds: [],
        messages: [],
        todos: [],
        nextTodoId: 1,
        created: Date.now(),
        updated: Date.now(),
      };

      (mockSessionRepository.getSessionById as any).mockResolvedValue(mockSession);
      (mockSessionRepository.addMessage as any).mockResolvedValue('msg-123');

      const observable = streamAIResponse({
        appContext: mockAppContext as AppContext,
        sessionRepository: mockSessionRepository as SessionRepository,
        aiConfig: mockAIConfig,
        sessionId: 'session-123',
        userMessage: 'test',
      });

      await new Promise<void>((resolve) => {
        observable.subscribe({
          next: (event) => {
            if (event.type === 'error' || event.type === 'complete') {
              resolve();
            }
          },
          error: () => resolve(),
          complete: () => resolve(),
        });
      });

      // Verify addMessage was called with metadata
      expect(mockSessionRepository.addMessage).toHaveBeenCalled();
      const addMessageCall = (mockSessionRepository.addMessage as any).mock.calls[0];
      expect(addMessageCall[6]).toBeDefined(); // metadata parameter
      expect(addMessageCall[6]).toHaveProperty('cpu');
      expect(addMessageCall[6]).toHaveProperty('memory');
    });
  });
});
