import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import Spinner from './Spinner.js';
import { useElapsedTime } from '@sylphx/code-client';
const StatusIndicator = ({ status }) => {
    if (status === 'running') {
        return (_jsxs(_Fragment, { children: [_jsx(Spinner, { color: "#FFD700" }), _jsx(Text, { children: " " })] }));
    }
    return status === 'completed'
        ? _jsx(Text, { color: "#00FF88", children: "\u2713 " })
        : _jsx(Text, { color: "#FF3366", children: "\u2717 " });
};
const ToolHeader = ({ statusIndicator, displayName, formattedArgs, durationDisplay, status, }) => (_jsxs(Box, { children: [statusIndicator, _jsx(Text, { bold: true, children: displayName }), formattedArgs && (_jsxs(_Fragment, { children: [_jsx(Text, { children: " " }), _jsx(Text, { children: formattedArgs })] })), durationDisplay && (status === 'completed' || status === 'running') && (_jsxs(Text, { dimColor: true, children: [" ", durationDisplay] }))] }));
const ResultDisplay = ({ status, formattedResult, error, }) => {
    // Don't show anything for running tools
    if (status === 'running') {
        return null;
    }
    if (status === 'failed') {
        return (_jsx(Box, { marginLeft: 2, children: _jsx(Text, { color: "#FF3366", children: error || 'Failed' }) }));
    }
    // For completed tools, show summary if available
    if (status === 'completed' && formattedResult.summary) {
        return (_jsx(Box, { marginLeft: 2, children: _jsx(Text, { children: formattedResult.summary }) }));
    }
    return null;
};
/**
 * Factory function to create a default tool display component
 *
 * @param displayName - Tool display name
 * @param formatArgs - Function to format tool arguments
 * @param formatResult - Function to format tool results
 * @returns A React component for displaying the tool
 */
export function createDefaultToolDisplay(displayName, formatArgs, formatResult) {
    return function DefaultToolDisplay(props) {
        const { status, duration, args, result, error, startTime } = props;
        // Calculate real-time elapsed time for running tools
        const { display: durationDisplay } = useElapsedTime({
            startTime,
            duration,
            isRunning: status === 'running',
        });
        const formattedArgs = formatArgs(args);
        const formattedResult = formatResult(result);
        return (_jsxs(Box, { flexDirection: "column", children: [_jsx(ToolHeader, { statusIndicator: _jsx(StatusIndicator, { status: status }), displayName: displayName, formattedArgs: formattedArgs, durationDisplay: durationDisplay, status: status }), _jsx(ResultDisplay, { status: status, result: result, formattedResult: formattedResult, error: error })] }));
    };
}
//# sourceMappingURL=DefaultToolDisplay.js.map