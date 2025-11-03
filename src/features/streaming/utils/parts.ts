/**
 * Stream Parts - Pure Functions
 * Handles manipulation of stream parts (text, reasoning, tools, errors)
 */

export type StreamPart =
  | { type: 'text'; content: string }
  | { type: 'reasoning'; content: string; completed?: boolean; duration?: number; startTime?: number }
  | { type: 'tool'; toolId: string; name: string; status: 'running' | 'completed' | 'failed'; duration?: number; args?: unknown; result?: unknown; error?: string; startTime?: number }
  | { type: 'error'; error: string };

/**
 * Add text chunk to stream parts
 * Appends to last text part or creates new one
 * @pure No side effects
 */
export function addTextChunk(parts: StreamPart[], chunk: string): StreamPart[] {
  if (parts.length === 0) {
    return [{ type: 'text', content: chunk }];
  }

  const lastPart = parts[parts.length - 1];

  // Append to existing text part
  if (lastPart.type === 'text') {
    return [
      ...parts.slice(0, -1),
      { type: 'text', content: lastPart.content + chunk },
    ];
  }

  // Create new text part
  return [...parts, { type: 'text', content: chunk }];
}

/**
 * Add or update reasoning part
 * @pure No side effects
 */
export function upsertReasoningPart(
  parts: StreamPart[],
  content: string,
  completed?: boolean
): StreamPart[] {
  const reasoningIdx = parts.findIndex((p) => p.type === 'reasoning');

  if (reasoningIdx === -1) {
    // No existing reasoning part, add new one
    return [
      ...parts,
      {
        type: 'reasoning',
        content,
        completed: completed ?? false,
        startTime: Date.now(),
      },
    ];
  }

  // Update existing reasoning part
  const existingPart = parts[reasoningIdx] as Extract<StreamPart, { type: 'reasoning' }>;
  const updatedPart: StreamPart = {
    type: 'reasoning',
    content,
    completed: completed ?? existingPart.completed,
    startTime: existingPart.startTime,
    duration: completed && existingPart.startTime
      ? Date.now() - existingPart.startTime
      : existingPart.duration,
  };

  return [
    ...parts.slice(0, reasoningIdx),
    updatedPart,
    ...parts.slice(reasoningIdx + 1),
  ];
}

/**
 * Add tool call part
 * @pure No side effects
 */
export function addToolPart(
  parts: StreamPart[],
  toolId: string,
  name: string,
  args?: unknown
): StreamPart[] {
  return [
    ...parts,
    {
      type: 'tool',
      toolId,
      name,
      status: 'running',
      args,
      startTime: Date.now(),
    },
  ];
}

/**
 * Update tool result
 * @pure No side effects
 */
export function updateToolResult(
  parts: StreamPart[],
  toolId: string,
  result: unknown
): StreamPart[] {
  const toolIdx = parts.findIndex(
    (p) => p.type === 'tool' && p.toolId === toolId
  );

  if (toolIdx === -1) return parts;

  const existingPart = parts[toolIdx] as Extract<StreamPart, { type: 'tool' }>;
  const updatedPart: StreamPart = {
    ...existingPart,
    status: 'completed',
    result,
    duration: existingPart.startTime ? Date.now() - existingPart.startTime : undefined,
  };

  return [
    ...parts.slice(0, toolIdx),
    updatedPart,
    ...parts.slice(toolIdx + 1),
  ];
}

/**
 * Update tool error
 * @pure No side effects
 */
export function updateToolError(
  parts: StreamPart[],
  toolId: string,
  error: string
): StreamPart[] {
  const toolIdx = parts.findIndex(
    (p) => p.type === 'tool' && p.toolId === toolId
  );

  if (toolIdx === -1) return parts;

  const existingPart = parts[toolIdx] as Extract<StreamPart, { type: 'tool' }>;
  const updatedPart: StreamPart = {
    ...existingPart,
    status: 'failed',
    error,
    duration: existingPart.startTime ? Date.now() - existingPart.startTime : undefined,
  };

  return [
    ...parts.slice(0, toolIdx),
    updatedPart,
    ...parts.slice(toolIdx + 1),
  ];
}

/**
 * Add error part
 * @pure No side effects
 */
export function addErrorPart(parts: StreamPart[], error: string): StreamPart[] {
  return [...parts, { type: 'error', error }];
}

/**
 * Get text content from stream parts
 * Extracts all text parts and joins them
 * @pure No side effects
 */
export function getTextContent(parts: StreamPart[]): string {
  return parts
    .filter((p) => p.type === 'text')
    .map((p) => (p as Extract<StreamPart, { type: 'text' }>).content)
    .join('');
}

/**
 * Check if stream has active tools
 * @pure No side effects
 */
export function hasActiveTools(parts: StreamPart[]): boolean {
  return parts.some((p) => p.type === 'tool' && p.status === 'running');
}

/**
 * Check if stream has errors
 * @pure No side effects
 */
export function hasErrors(parts: StreamPart[]): boolean {
  return parts.some((p) => p.type === 'error' || (p.type === 'tool' && p.status === 'failed'));
}
