/**
 * FullScreen Component
 * Uses alternate screen buffer for true fullscreen (like vim/less)
 * Based on: https://github.com/vadimdemedes/ink/issues/263
 */

import React, { useEffect, useState, PropsWithChildren } from 'react';
import { Box, BoxProps, useStdout } from 'ink';

const enterAltScreenCommand = '\x1b[?1049h';
const leaveAltScreenCommand = '\x1b[?1049l';

/**
 * Hook to get terminal dimensions and track resize
 */
function useStdoutDimensions(): [number, number] {
  const { stdout } = useStdout();
  const { columns, rows } = stdout;
  const [size, setSize] = useState({ columns, rows });

  useEffect(() => {
    function onResize() {
      const { columns, rows } = stdout;
      setSize({ columns, rows });
    }

    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout]);

  return [size.columns, size.rows];
}

/**
 * FullScreen component
 * Enters alternate screen buffer and fills terminal dimensions
 */
export function FullScreen({ children, ...props }: PropsWithChildren<BoxProps>) {
  const [columns, rows] = useStdoutDimensions();

  useEffect(() => {
    // Enter alternate screen buffer
    process.stdout.write(enterAltScreenCommand);

    // Exit alternate screen buffer on unmount
    return () => {
      process.stdout.write(leaveAltScreenCommand);
    };
  }, []);

  return (
    <Box width={columns} height={rows} {...props}>
      {children}
    </Box>
  );
}
