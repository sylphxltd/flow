/**
 * Streaming Buffer - Pure Functions
 * Handles buffering and batching of streaming text chunks
 */

export interface StreamBuffer {
  chunks: string[];
  timeout: NodeJS.Timeout | null;
}

/**
 * Create initial buffer state
 * @pure No side effects
 */
export function createBuffer(): StreamBuffer {
  return {
    chunks: [],
    timeout: null,
  };
}

/**
 * Add chunk to buffer
 * Returns new buffer state (immutable)
 * @pure No side effects
 */
export function addChunk(buffer: StreamBuffer, chunk: string): StreamBuffer {
  return {
    ...buffer,
    chunks: [...buffer.chunks, chunk],
  };
}

/**
 * Flush buffer and return accumulated text
 * Returns [flushedText, newBuffer]
 * @pure No side effects
 */
export function flushBuffer(buffer: StreamBuffer): [string, StreamBuffer] {
  if (buffer.chunks.length === 0) {
    return ['', buffer];
  }

  const accumulatedText = buffer.chunks.join('');
  const newBuffer: StreamBuffer = {
    ...buffer,
    chunks: [],
  };

  return [accumulatedText, newBuffer];
}

/**
 * Clear timeout from buffer
 * Returns new buffer state
 * @pure No side effects on buffer state (timeout clearing is handled by caller)
 */
export function clearBufferTimeout(buffer: StreamBuffer): StreamBuffer {
  return {
    ...buffer,
    timeout: null,
  };
}

/**
 * Set timeout on buffer
 * Returns new buffer state
 * @pure No side effects on buffer state (timeout setting is handled by caller)
 */
export function setBufferTimeout(buffer: StreamBuffer, timeout: NodeJS.Timeout): StreamBuffer {
  return {
    ...buffer,
    timeout,
  };
}

/**
 * Check if buffer has pending chunks
 * @pure No side effects
 */
export function hasChunks(buffer: StreamBuffer): boolean {
  return buffer.chunks.length > 0;
}

/**
 * Get accumulated text without flushing
 * @pure No side effects
 */
export function getAccumulatedText(buffer: StreamBuffer): string {
  return buffer.chunks.join('');
}
