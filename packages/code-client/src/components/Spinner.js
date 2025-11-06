import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Spinner Component
 * Animated loading indicator
 */
import { Text } from 'ink';
import { useEffect, useState } from 'react';
const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
export default function Spinner({ label, color = '#00FF88' }) {
    const [frame, setFrame] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => {
            setFrame((prev) => (prev + 1) % frames.length);
        }, 80);
        return () => clearInterval(timer);
    }, []);
    return (_jsxs(_Fragment, { children: [_jsx(Text, { color: color, children: frames[frame] }), label && _jsxs(Text, { color: "gray", children: [" ", label] })] }));
}
//# sourceMappingURL=Spinner.js.map