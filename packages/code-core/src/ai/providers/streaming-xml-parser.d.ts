/**
 * Streaming XML Parser for Text-based Tool Calls
 * Parses XML tags incrementally as text streams in
 * Emits streaming events for text and tool calls
 */
export type StreamingXMLEvent = {
    type: 'text-start';
} | {
    type: 'text-delta';
    delta: string;
} | {
    type: 'text-end';
} | {
    type: 'tool-input-start';
    toolCallId: string;
    toolName: string;
} | {
    type: 'tool-input-delta';
    toolCallId: string;
    delta: string;
} | {
    type: 'tool-input-end';
    toolCallId: string;
} | {
    type: 'tool-call-complete';
    toolCallId: string;
    toolName: string;
    arguments: Record<string, unknown>;
};
/**
 * Streaming XML Parser
 * Processes text chunks and emits events as XML tags are detected
 */
export declare class StreamingXMLParser {
    private state;
    private buffer;
    private eventQueue;
    /**
     * Process a chunk of text and emit events
     */
    processChunk(chunk: string): Generator<StreamingXMLEvent>;
    /**
     * Drain and yield all queued events
     */
    private drainEventQueue;
    /**
     * Flush remaining content and emit final events
     */
    flush(): Generator<StreamingXMLEvent>;
    private processBuffer;
}
//# sourceMappingURL=streaming-xml-parser.d.ts.map