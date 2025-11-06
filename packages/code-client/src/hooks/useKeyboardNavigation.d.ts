/**
 * Keyboard Navigation Hook
 * Handles all keyboard input for chat navigation, selection, and command modes
 */
import type { Command, CommandContext, WaitForInputOptions } from '../types/command-types.js';
export interface KeyboardNavigationProps {
    input: string;
    cursor: number;
    isStreaming: boolean;
    pendingInput: WaitForInputOptions | null;
    pendingCommand: {
        command: Command;
        currentInput: string;
    } | null;
    filteredFileInfo: {
        hasAt: boolean;
        files: Array<{
            path: string;
            relativePath: string;
            size: number;
        }>;
        query: string;
        atIndex: number;
    };
    filteredCommands: Command[];
    multiSelectionPage: number;
    multiSelectionAnswers: Record<string, string | string[]>;
    multiSelectChoices: Set<string>;
    selectionFilter: string;
    isFilterMode: boolean;
    freeTextInput: string;
    isFreeTextMode: boolean;
    selectedCommandIndex: number;
    selectedFileIndex: number;
    skipNextSubmit: React.MutableRefObject<boolean>;
    lastEscapeTime: React.MutableRefObject<number>;
    inputResolver: React.MutableRefObject<((value: string | Record<string, string | string[]>) => void) | null>;
    commandSessionRef: React.MutableRefObject<string | null>;
    abortControllerRef: React.MutableRefObject<AbortController | null>;
    cachedOptions: Map<string, Array<{
        id: string;
        name: string;
    }>>;
    setInput: (value: string) => void;
    setCursor: (value: number) => void;
    setShowEscHint: (value: boolean) => void;
    setMultiSelectionPage: (value: number | ((prev: number) => number)) => void;
    setSelectedCommandIndex: (value: number | ((prev: number) => number)) => void;
    setMultiSelectionAnswers: (value: Record<string, string | string[]> | ((prev: Record<string, string | string[]>) => Record<string, string | string[]>)) => void;
    setMultiSelectChoices: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    setSelectionFilter: (value: string | ((prev: string) => string)) => void;
    setIsFilterMode: (value: boolean) => void;
    setFreeTextInput: (value: string | ((prev: string) => string)) => void;
    setIsFreeTextMode: (value: boolean) => void;
    setSelectedFileIndex: (value: number | ((prev: number) => number)) => void;
    setPendingInput: (value: WaitForInputOptions | null) => void;
    setPendingCommand: (value: {
        command: Command;
        currentInput: string;
    } | null) => void;
    addLog: (message: string) => void;
    addMessage: (sessionId: string | null, role: 'user' | 'assistant', content: string, attachments?: any[], usage?: any, finishReason?: string, metadata?: any, todoSnapshot?: any[], provider?: string, model?: string) => Promise<string>;
    addAttachment: (attachment: {
        path: string;
        relativePath: string;
        size?: number;
    }) => void;
    setAttachmentTokenCount: (path: string, count: number) => void;
    createCommandContext: (args: string[]) => CommandContext;
    getAIConfig: () => {
        defaultProvider?: string;
        defaultModel?: string;
    } | null;
    currentSessionId: string | null;
    currentSession: any;
}
export declare function useKeyboardNavigation(props: KeyboardNavigationProps): void;
//# sourceMappingURL=useKeyboardNavigation.d.ts.map