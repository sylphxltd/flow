/**
 * Session Serializer Utils
 * Pure functions for session JSON serialization and deserialization
 * Handles safe parsing with validation and migration
 */

import type { Session } from '../../../types/session.types.js';
import { migrateSessionData, validateSession } from './migration.js';

/**
 * Serialize session to JSON string
 * Updates timestamp before serializing
 */
export function serializeSession(session: Session, compact = false): string {
  // Update timestamp
  const sessionWithTimestamp = {
    ...session,
    updated: Date.now(),
  };

  if (compact) {
    // Compact format - no whitespace (faster, smaller files)
    return JSON.stringify(sessionWithTimestamp);
  }

  // Pretty format - with indentation (easier to debug)
  return JSON.stringify(sessionWithTimestamp, null, 2);
}

/**
 * Deserialize session from JSON string
 * Returns null if parsing fails or data is invalid
 */
export function deserializeSession(json: string): Session | null {
  try {
    const raw = JSON.parse(json);
    const migrated = migrateSessionData(raw);

    if (!migrated) {
      return null;
    }

    if (!validateSession(migrated)) {
      return null;
    }

    return migrated;
  } catch {
    return null;
  }
}

/**
 * Safe JSON parse that returns null on error
 * Generic utility for parsing any JSON
 */
export function safeParseJSON<T = any>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Serialize session with error handling
 * Returns error message if serialization fails
 */
export function serializeSessionSafe(session: Session, compact = false): {
  success: true;
  data: string;
} | {
  success: false;
  error: string;
} {
  try {
    const data = serializeSession(session, compact);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown serialization error',
    };
  }
}

/**
 * Deserialize session with detailed error reporting
 * Returns error message if deserialization fails
 */
export function deserializeSessionSafe(json: string): {
  success: true;
  data: Session;
} | {
  success: false;
  error: string;
  stage: 'parse' | 'migration' | 'validation';
} {
  try {
    const raw = JSON.parse(json);

    const migrated = migrateSessionData(raw);
    if (!migrated) {
      return {
        success: false,
        error: 'Migration failed - invalid session data structure',
        stage: 'migration',
      };
    }

    if (!validateSession(migrated)) {
      return {
        success: false,
        error: 'Validation failed - session data does not match schema',
        stage: 'validation',
      };
    }

    return { success: true, data: migrated };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse JSON',
      stage: 'parse',
    };
  }
}

/**
 * Calculate serialized size of session in bytes
 * Useful for checking file size before writing
 */
export function getSerializedSize(session: Session, compact = true): number {
  const json = serializeSession(session, compact);
  // Use Buffer.byteLength for accurate UTF-8 byte count
  return Buffer.byteLength(json, 'utf8');
}

/**
 * Serialize session with size limit
 * Returns error if serialized size exceeds limit
 */
export function serializeSessionWithLimit(
  session: Session,
  maxSizeBytes: number,
  compact = true
): {
  success: true;
  data: string;
  size: number;
} | {
  success: false;
  error: string;
  actualSize: number;
  maxSize: number;
} {
  try {
    const data = serializeSession(session, compact);
    const size = Buffer.byteLength(data, 'utf8');

    if (size > maxSizeBytes) {
      return {
        success: false,
        error: 'Serialized session exceeds size limit',
        actualSize: size,
        maxSize: maxSizeBytes,
      };
    }

    return { success: true, data, size };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Serialization failed',
      actualSize: 0,
      maxSize: maxSizeBytes,
    };
  }
}

/**
 * Pretty-print session JSON
 * Useful for debugging or export
 */
export function prettyPrintSession(session: Session): string {
  return serializeSession(session, false);
}

/**
 * Compact session JSON
 * Useful for storage optimization
 */
export function compactSession(session: Session): string {
  return serializeSession(session, true);
}

/**
 * Check if string is valid JSON
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if JSON string represents a valid session
 */
export function isValidSessionJSON(json: string): boolean {
  const session = deserializeSession(json);
  return session !== null;
}

/**
 * Extract session ID from JSON without full deserialization
 * Returns null if JSON is invalid or ID is missing
 * Useful for quick session identification
 */
export function extractSessionId(json: string): string | null {
  try {
    const raw = JSON.parse(json);
    return typeof raw.id === 'string' ? raw.id : null;
  } catch {
    return null;
  }
}

/**
 * Extract session metadata (id, provider, model, timestamps) without full deserialization
 * Useful for listing sessions without loading full data
 */
export function extractSessionMetadata(json: string): {
  id: string;
  provider: string;
  model: string;
  title?: string;
  created: number;
  updated: number;
} | null {
  try {
    const raw = JSON.parse(json);

    if (!raw.id || !raw.provider || !raw.model) {
      return null;
    }

    return {
      id: raw.id,
      provider: raw.provider,
      model: raw.model,
      title: raw.title,
      created: raw.created ?? 0,
      updated: raw.updated ?? 0,
    };
  } catch {
    return null;
  }
}
