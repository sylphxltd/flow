/**
 * Session Title Generation Utility
 * Re-exports pure functions from feature and adds streaming functionality
 */
import type { ProviderId } from '../types/config.types.js';
export { generateSessionTitle, formatSessionDisplay, formatRelativeTime, cleanTitle, truncateTitle, } from '../session/utils/title.js';
/**
 * Generate a session title using LLM with streaming
 */
export declare function generateSessionTitleWithStreaming(firstMessage: string, provider: ProviderId, modelName: string, providerConfig: any, onChunk: (chunk: string) => void): Promise<string>;
//# sourceMappingURL=session-title.d.ts.map