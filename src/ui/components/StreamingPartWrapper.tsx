/**
 * Streaming Part Wrapper Component
 *
 * Renders a streaming part with consistent structure for both static and dynamic regions.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { MessagePart } from './MessagePart.js';
import type { MessagePart as StreamPart } from '../../types/session.types.js';

// Debug flag
const SHOW_DEBUG_INDICATORS = false;

interface StreamingPartWrapperProps {
  part: StreamPart;
  debugRegion?: 'static' | 'dynamic';
}

export function StreamingPartWrapper({ part, debugRegion }: StreamingPartWrapperProps) {
  // Get status with fallback for old messages without status field
  const status = 'status' in part ? part.status : 'completed';

  return (
    <Box flexDirection="column">
      {(debugRegion || SHOW_DEBUG_INDICATORS) && (
        <Box>
          <Text
            backgroundColor={
              debugRegion === 'static' ? 'green' :
              debugRegion === 'dynamic' ? 'blue' :
              'gray'
            }
            color="black"
          >
            {' '}{part.type.toUpperCase()}: {status} {debugRegion ? `[${debugRegion.toUpperCase()}]` : ''}{' '}
          </Text>
        </Box>
      )}
      <MessagePart part={part} />
    </Box>
  );
}
