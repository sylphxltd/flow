/**
 * MaybeStatic Component
 *
 * Conditionally wraps children in Ink's Static component based on isStatic prop.
 * Simplifies logic by encapsulating Static wrapping decision.
 *
 * Usage:
 * <MaybeStatic isStatic={msg.status !== 'active'}>
 *   <Box>Content here</Box>
 * </MaybeStatic>
 */

import React from 'react';
import { Static } from 'ink';

interface MaybeStaticProps {
  isStatic: boolean;
  children: React.ReactNode;
}

export function MaybeStatic({ isStatic, children }: MaybeStaticProps) {
  if (isStatic) {
    return <Static items={[true]}>{() => children}</Static>;
  }

  return <>{children}</>;
}
