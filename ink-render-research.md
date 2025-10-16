# Ink Render Function Research Report

## Overview

This research document provides comprehensive information about the `render` function options in Ink (v6.3.1), particularly focusing on fullscreen terminal applications and input handling configuration.

## Current Implementation Analysis

Based on the existing codebase in `/Users/kyle/rules/src/commands/memory-tui-command.ts`, the current implementation attempts to use:

```typescript
const { waitUntilExit } = render(React.createElement(MemoryTUI), {
  // Configure Ink for fullscreen and better input handling
  exitOnCtrlC: false,
  patchConsole: false,
  debug: false,
  // Fullscreen configuration (INCORRECT - not supported)
  fullscreen: true,
  // Alternative raw mode handling (INCORRECT - not supported)
  raw: true,
});
```

**⚠️ IMPORTANT**: The `fullscreen` and `raw` options do not exist in Ink's RenderOptions interface and will cause TypeScript errors.

## Complete Render Function Options

### Core Options

```typescript
render(tree, options?)
```

#### `tree` (Required)
- **Type**: `ReactElement`
- **Description**: The React component tree to render

#### `options` (Optional)
- **Type**: `object`
- **Description**: Configuration object for customizing render behavior

### Available Options

#### Stream Configuration
- **`stdout`**: `stream.Writable` (Default: `process.stdout`)
  - Output stream where the app will be rendered
  - Useful for testing or custom output destinations

- **`stdin`**: `stream.Readable` (Default: `process.stdin`)
  - Input stream where the app will listen for input
  - Essential for custom input handling

- **`stderr`**: `stream.Writable` (Default: `process.stderr`)
  - Error stream for error output

#### Exit Behavior
- **`exitOnCtrlC`**: `boolean` (Default: `true`)
  - Configure whether Ink should listen for Ctrl+C and exit the app
  - Critical when `process.stdin` is in raw mode (Ctrl+C is ignored by default)
  - Set to `false` for custom Ctrl+C handling

#### Console and Debug
- **`patchConsole`**: `boolean` (Default: `true`)
  - Whether to patch console methods to preserve Ink output
  - Set to `false` to prevent console output interference

- **`debug`**: `boolean` (Default: `false`)
  - Enable debug mode for development troubleshooting

#### Performance
- **`maxFps`**: `number` (Default: `undefined`)
  - Maximum frames per second for rendering
  - Useful for performance optimization

#### Accessibility
- **`isScreenReaderEnabled`**: `boolean` (Default: `false`)
  - Enable screen reader support for accessibility
  - Generates screen-reader-friendly output

#### Performance
- **`maxFps`**: `number` (Default: `30`)
  - Maximum frames per second for render updates
  - Controls how frequently the UI can update to prevent excessive re-rendering
  - Higher values allow more frequent updates but may impact performance

## Fullscreen Behavior in Ink

**Important Note**: Ink does not have a `fullscreen` option in the render function. Fullscreen behavior is achieved through:

1. **Layout Design**: Using `Box` components with `height="100%"` and `width="100%"`
2. **Terminal Clearing**: Ink automatically manages terminal output clearing
3. **Raw Mode**: Handled internally by Ink's input system

### Example Fullscreen Layout
```typescript
const FullscreenApp = () => (
  <Box flexDirection="column" height="100%" width="100%">
    <Box borderStyle="single" padding={1}>
      <Text>Header</Text>
    </Box>
    <Box flexGrow={1} justifyContent="center" alignItems="center">
      <Text>Main Content</Text>
    </Box>
    <Box borderStyle="single" padding={1}>
      <Text>Footer</Text>
    </Box>
  </Box>
);
```

## Input Handling Configuration

### Raw Mode Management

Ink automatically manages raw mode internally when using `useInput`. You don't need to set `raw: true` in render options.

**Ink's Automatic Raw Mode**
- Enabled automatically when using `useInput` hook
- Captures all keystrokes immediately
- No line buffering or special character processing
- Essential for interactive applications
- Captures Ctrl+C, arrow keys, function keys
- Automatically managed - no manual setup needed

**When Raw Mode is Active**
- When `useInput` hook is used in any component
- When `exitOnCtrlC: false` is set (manual Ctrl+C handling)
- Ink handles enabling/disabling raw mode automatically

### Input Handling Hooks

#### `useInput` Hook (Recommended)
```typescript
import { useInput } from 'ink';

useInput((input, key) => {
  // input: string - character(s) typed
  // key: object - special key information
  
  if (input === 'q') exit();
  if (key.leftArrow) moveLeft();
  if (key.ctrl && input === 'c') exit();
});
```

#### `useStdin` Hook (Advanced)
```typescript
import { useStdin } from 'ink';

const { stdin, setRawMode, isRawModeSupported } = useStdin();

useEffect(() => {
  if (isRawModeSupported) {
    setRawMode(true);
    // Custom input handling
    stdin.on('data', handler);
    return () => {
      stdin.removeListener('data', handler);
      setRawMode(false);
    };
  }
}, []);
```

## Fullscreen Application Best Practices

### Recommended Configuration
```typescript
const instance = render(<App />, {
  // Input handling
  exitOnCtrlC: false, // Handle manually in useInput
  
  // Console management
  patchConsole: false, // Prevent interference
  
  // Performance
  maxFps: 30, // Limit for performance
  
  // Accessibility
  isScreenReaderEnabled: false, // Enable if needed
});
```

### Instance Control Methods
```typescript
const { waitUntilExit, unmount, clear } = instance;

// Wait for app to exit
await waitUntilExit();

// Manually unmount
unmount();

// Clear terminal output
clear();
```

## Terminal Mode Considerations

### When to Use Raw Mode
- Interactive applications requiring immediate input
- Games or real-time interfaces
- Applications needing special key combinations
- Custom keyboard shortcuts

### When to Use Cooked Mode
- Simple command-line tools
- Applications with basic input/output
- When system key handling is preferred
- Text input applications

## Terminal Cleanup and Best Practices

### Automatic Cleanup
Ink automatically handles:
- Terminal mode restoration on exit
- Raw mode cleanup
- Console method restoration
- Event listener cleanup

### Manual Cleanup (When Needed)
```typescript
useEffect(() => {
  // Custom setup if needed
  
  return () => {
    // Cleanup is handled automatically by Ink
    // No need to manually restore terminal modes
  };
}, []);
```

### Proper Exit Handling
```typescript
useInput((input, key) => {
  if (input === 'q' || (key.ctrl && input === 'c')) {
    exit(); // Ink handles cleanup automatically
  }
});
```

## Error Handling and Cleanup

### Proper Cleanup
```typescript
useEffect(() => {
  return () => {
    // Cleanup on unmount
    setRawMode(false);
    // Remove event listeners
  };
}, []);
```

### Error Handling
```typescript
try {
  await instance.waitUntilExit();
  console.log('App exited normally');
} catch (error) {
  console.error('App exited with error:', error);
}
```

## Performance Optimization

### Frame Rate Control
```typescript
render(<App />, {
  maxFps: 30, // Limit to 30 FPS for performance
});
```

### Render Optimization
- Use `useCallback` for event handlers
- Minimize re-renders with proper state management
- Consider using external state for complex applications (as seen in current codebase)

## Accessibility Considerations

### Screen Reader Support
```typescript
render(<App />, {
  isScreenReaderEnabled: true,
});
```

### Accessible Components
```typescript
const isScreenReaderEnabled = useIsScreenReaderEnabled();

if (isScreenReaderEnabled) {
  return <Text aria-label="Descriptive text">Content</Text>;
}
```

## Testing Configuration

### Test Setup
```typescript
import { render } from 'ink-testing-library';

const { lastFrame, stdin } = render(<App />);

// Simulate input
stdin.write('q');
```

## Migration from Current Implementation

The current implementation has **critical errors** that need to be fixed:

### ❌ Issues to Fix
1. **Remove `fullscreen: true`** - This option doesn't exist in Ink
2. **Remove `raw: true`** - This option doesn't exist in Ink
3. **Raw mode is handled internally** by Ink's `useInput` hook

### ✅ Improvements to Add
1. **Add `maxFps: 30`** for performance control
2. **Consider screen reader support** for accessibility
3. **Implement proper cleanup** in useEffect hooks
4. **Add error boundaries** for better error handling

### Corrected Implementation
```typescript
const { waitUntilExit } = render(React.createElement(MemoryTUI), {
  exitOnCtrlC: false,
  patchConsole: false,
  debug: false,
  maxFps: 30, // Add this for performance
});
```

## Recommended Final Configuration

```typescript
const { waitUntilExit } = render(React.createElement(MemoryTUI), {
  // Input handling
  exitOnCtrlC: false, // Handle Ctrl+C manually in useInput
  
  // Console and debugging
  patchConsole: false, // Prevent console interference
  debug: process.env.NODE_ENV === 'development',
  
  // Performance
  maxFps: 30, // Limit frame rate for better performance
  
  // Accessibility (optional)
  isScreenReaderEnabled: process.env.SCREEN_READER === 'true',
});
```

## Conclusion

Ink's render function provides comprehensive options for building fullscreen terminal applications with sophisticated input handling. The current implementation in the codebase follows best practices but could be enhanced with performance controls and accessibility features.