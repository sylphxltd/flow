import { z } from 'zod';

// ============================================================================
// WEBSOCKET INTERFACES
// ============================================================================

/**
 * WebSocket message structure
 */
export interface WebSocketMessage<T = unknown> {
  /** Message type for routing */
  type: string;
  /** Message payload */
  payload: T;
  /** Message ID for correlation */
  id?: string;
  /** Timestamp when message was created */
  timestamp: string;
  /** Message metadata */
  metadata?: {
    /** Sender ID */
    senderId?: string;
    /** Recipient ID (for direct messages) */
    recipientId?: string;
    /** Room or channel ID */
    room?: string;
    /** Message version for compatibility */
    version?: string;
    /** Whether message requires acknowledgment */
    requiresAck?: boolean;
    /** Message priority */
    priority?: 'low' | 'normal' | 'high';
  };
}

/**
 * WebSocket connection status
 */
export interface WebSocketConnectionStatus {
  /** Connection state */
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';
  /** Connection ID */
  connectionId?: string;
  /** URL of connected server */
  url?: string;
  /** Connection timestamp */
  connectedAt?: string;
  /** Last activity timestamp */
  lastActivity?: string;
  /** Number of reconnection attempts */
  retryCount?: number;
  /** Connection error (if any) */
  error?: string;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const WebSocketMessageSchema = z.object({
  type: z.string(),
  payload: z.unknown(),
  id: z.string().optional(),
  timestamp: z.string(),
  metadata: z.object({
    senderId: z.string().optional(),
    recipientId: z.string().optional(),
    room: z.string().optional(),
    version: z.string().optional(),
    requiresAck: z.boolean().optional(),
    priority: z.enum(['low', 'normal', 'high']).optional(),
  }).optional(),
});

export const WebSocketConnectionStatusSchema = z.object({
  status: z.enum(['connecting', 'connected', 'disconnected', 'error', 'reconnecting']),
  connectionId: z.string().optional(),
  url: z.string().optional(),
  connectedAt: z.string().optional(),
  lastActivity: z.string().optional(),
  retryCount: z.number().min(0).optional(),
  error: z.string().optional(),
});