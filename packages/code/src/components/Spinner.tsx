/**
 * Spinner Component
 * Animated loading indicator
 */

import { Text } from 'ink';
import React, { useEffect, useState } from 'react';

const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

interface SpinnerProps {
  label?: string;
  color?: string;
}

export default function Spinner({ label, color = '#00FF88' }: SpinnerProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, 80);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Text color={color}>{frames[frame]}</Text>
      {label && <Text color="gray"> {label}</Text>}
    </>
  );
}
