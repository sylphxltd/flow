# Tool Display System

Simple, unified API for configuring tool display using factory pattern.

## Core Principle

**The default display system does not know about specific tools.**

Each tool registers itself with its own display logic. The system only provides:
- A factory function to create default displays
- A registry to store tool components
- Generic rendering utilities

## Basic Usage

### Default Display (Factory Pattern)

For most tools, use the factory function with formatters:

```ts
import { registerTool, createDefaultToolDisplay } from '../ui/utils/tool-configs.js';

registerTool('myTool', createDefaultToolDisplay(
  'My Tool',                                        // Display name
  (args) => `Processing ${args.filename}`,          // Format args
  (result) => ({                                    // Format result
    lines: ['Line 1', 'Line 2'],
    summary: 'Processed 2 items',
  })
));
```

### Custom Component

For complete control over rendering:

```tsx
import { registerTool, type ToolDisplayProps } from '../ui/utils/tool-configs.js';

function MyCustomToolDisplay({ name, status, args, result }: ToolDisplayProps) {
  return (
    <Box flexDirection="column">
      <Text color="magenta">🎨 {name}</Text>
      {status === 'running' && <Text>Loading...</Text>}
      {status === 'completed' && <Text>Done!</Text>}
    </Box>
  );
}

registerTool('myTool', MyCustomToolDisplay);
```

## Built-in Tools Configuration

All built-in tools are pre-configured in `src/ui/utils/tool-configs.ts`:

```ts
export const toolConfigs: Record<string, ToolConfig> = {
  read: createDefaultToolDisplay(
    'Read',
    (args) => getRelativePath(args.file_path),
    (result) => ({
      summary: `Read ${lineCount} lines`,
      lines: [],
    })
  ),

  // ... more tools
};
```

## Modifying a Tool Display

### Change display name or formatting:

Edit the tool config in `src/ui/utils/tool-configs.ts`:

```ts
read: createDefaultToolDisplay(
  'Read File',  // Changed from 'Read'
  (args) => `📄 ${getRelativePath(args.file_path)}`,  // Added icon
  (result) => {
    // ... result formatting
  }
)
```

### Replace with custom component:

```ts
import { MyCustomReadDisplay } from './components/MyCustomReadDisplay.js';

// In tool-configs.ts
read: MyCustomReadDisplay,
```

## Single Source of Truth

**Before**: Change tool display → modify multiple files
- args formatter in one file
- result formatter in another file
- display name in yet another file

**Now**: Change tool display → modify 1 place
- All in tool-configs.ts (or call `registerTool()`)

## Examples

### Add icon to bash commands:

```ts
bash: createDefaultToolDisplay(
  '⚡ Bash',  // Added icon
  (args) => formatBashCommand(args),
  (result) => formatBashResult(result)
)
```

### Custom display for a specific tool:

```tsx
function ImageToolDisplay({ args, result, status }: ToolDisplayProps) {
  if (status === 'completed' && result?.imageUrl) {
    return (
      <Box>
        <Text>🖼️  Image generated: {result.imageUrl}</Text>
      </Box>
    );
  }
  return <Text>Generating image...</Text>;
}

registerTool('generateImage', ImageToolDisplay);
```

### Reuse formatters with different names:

```ts
import { registerTool, createDefaultToolDisplay } from '../ui/utils/tool-configs.js';

// Create similar display with different name
registerTool('createFile', createDefaultToolDisplay(
  'Create',
  (args) => args.file_path ? getRelativePath(args.file_path) : '',
  (result) => formatWriteResult(result)
));
```
