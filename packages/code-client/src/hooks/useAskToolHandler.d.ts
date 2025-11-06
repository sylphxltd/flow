/**
 * Ask Tool Handler Hook
 * Registers user input handler for the ask tool
 */
import type { WaitForInputOptions } from '../types/command-types.js';
interface UseAskToolHandlerProps {
    setPendingInput: (input: WaitForInputOptions | null) => void;
    setMultiSelectionPage: (page: number) => void;
    setMultiSelectionAnswers: (answers: Record<string, string | string[]>) => void;
    setSelectionFilter: (filter: string) => void;
    setSelectedCommandIndex: (index: number) => void;
    setAskQueueLength: (length: number) => void;
    inputResolver: React.MutableRefObject<((value: string | Record<string, string | string[]>) => void) | null>;
    addDebugLog: (message: string) => void;
}
export declare function useAskToolHandler({ setPendingInput, setMultiSelectionPage, setMultiSelectionAnswers, setSelectionFilter, setSelectedCommandIndex, setAskQueueLength, inputResolver, addDebugLog, }: UseAskToolHandlerProps): void;
export {};
//# sourceMappingURL=useAskToolHandler.d.ts.map