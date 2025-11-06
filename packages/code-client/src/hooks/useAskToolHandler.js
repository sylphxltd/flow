/**
 * Ask Tool Handler Hook
 * Registers user input handler for the ask tool
 */
import { useEffect } from 'react';
import { setUserInputHandler, clearUserInputHandler, setQueueUpdateCallback } from '@sylphx/code-core';
export function useAskToolHandler({ setPendingInput, setMultiSelectionPage, setMultiSelectionAnswers, setSelectionFilter, setSelectedCommandIndex, setAskQueueLength, inputResolver, addDebugLog, }) {
    useEffect(() => {
        setUserInputHandler((request) => {
            return new Promise((resolve) => {
                addDebugLog(`[ask tool] Waiting for user selection (${request.questions.length} question${request.questions.length > 1 ? 's' : ''})`);
                inputResolver.current = resolve;
                setPendingInput(request);
                // Reset selection state
                setMultiSelectionPage(0);
                setMultiSelectionAnswers({});
                setSelectionFilter('');
                setSelectedCommandIndex(0);
            });
        });
        // Set queue update callback
        setQueueUpdateCallback((count) => {
            setAskQueueLength(count);
        });
        return () => {
            clearUserInputHandler();
        };
    }, [
        addDebugLog,
        setPendingInput,
        setMultiSelectionPage,
        setMultiSelectionAnswers,
        setSelectionFilter,
        setSelectedCommandIndex,
        setAskQueueLength,
        inputResolver,
    ]);
}
//# sourceMappingURL=useAskToolHandler.js.map