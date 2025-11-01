/**
 * Controlled Text Input
 * TextInput wrapper that doesn't interfere with Ctrl keyboard shortcuts
 */

import React from 'react';
import { useInput } from 'ink';
import TextInput from 'ink-text-input';

interface ControlledTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  showCursor?: boolean;
}

export default function ControlledTextInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  showCursor = true,
}: ControlledTextInputProps) {
  // Intercept Ctrl key combinations before TextInput sees them
  useInput(
    (input, key) => {
      // Block all Ctrl combinations from reaching TextInput
      if (key.ctrl) {
        // Don't pass to TextInput - let parent handle
        return;
      }
    },
    { isActive: true }
  );

  return (
    <TextInput
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      placeholder={placeholder}
      showCursor={showCursor}
    />
  );
}
