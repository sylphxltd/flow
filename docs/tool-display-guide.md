# Tool Display System

Two ways to configure how tools are displayed in the UI.

## 1. Formatter Config (Simple)

For most tools, just define how to format args and results.

```ts
import { registerToolFormatter } from '../ui/utils/tool-configs.js';

registerToolFormatter('myTool', {
  displayName: 'My Tool',
  formatArgs: (args) => {
    // Return string to display after tool name
    return `Processing ${args.filename}`;
  },
  formatResult: (result) => {
    // Return lines and optional summary
    return {
      lines: ['Line 1', 'Line 2'],
      summary: 'Processed 2 items',
    };
  },
});
```

## 2. Custom Component (Advanced)

For complete control over rendering.

```tsx
import React from 'react';
import { Box, Text } from 'ink';
import { registerToolDisplay, type ToolDisplayProps } from '../ui/utils/tool-configs.js';

function MyCustomToolDisplay({ name, status, args, result, error }: ToolDisplayProps) {
  return (
    <Box flexDirection="column">
      <Text color="magenta">🎨 {name} - Custom Display</Text>
      {status === 'running' && <Text>Loading...</Text>}
      {status === 'completed' && <Text>Done! {JSON.stringify(result)}</Text>}
      {status === 'failed' && <Text color="red">Error: {error}</Text>}
    </Box>
  );
}

registerToolDisplay('myTool', MyCustomToolDisplay);
```

## Built-in Tools Configuration

All built-in tools are pre-configured in `src/ui/utils/tool-configs.ts`:

```ts
export const toolConfigs: Record<string, ToolConfig> = {
  read: {
    type: 'formatter',
    displayName: 'Read',
    formatArgs: (args) => getRelativePath(args.file_path),
    formatResult: (result) => ({
      summary: `Read ${lineCount} lines`,
      lines: [],
    }),
  },

  // ... more tools
};
```

## Modifying a Tool Display

### Change display name or formatting:

Edit the tool config in `src/ui/utils/tool-configs.ts`:

```ts
read: {
  type: 'formatter',
  displayName: 'Read File',  // Changed from 'Read'
  formatArgs: (args) => `📄 ${getRelativePath(args.file_path)}`,  // Added icon
  // ... rest stays same
}
```

### Replace with custom component:

```ts
import { MyCustomReadDisplay } from './components/MyCustomReadDisplay.js';

// In tool-configs.ts
read: {
  type: 'component',
  component: MyCustomReadDisplay,
}
```

## Single Source of Truth

**Before**: Change tool display → modify 2-3 files
- tool-formatters.ts
- tool-display-utils.ts
- ToolDisplay.tsx

**Now**: Change tool display → modify 1 place
- tool-configs.ts (or call register function)

## Examples

### Add icon to bash commands:

```ts
bash: {
  type: 'formatter',
  displayName: '⚡ Bash',  // Added icon
  // ... rest unchanged
}
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

registerToolDisplay('generateImage', ImageToolDisplay);
```

### Reuse formatters with different names:

```ts
import { toolConfigs } from '../ui/utils/tool-configs.js';

// Clone existing formatter but with different name
const writeConfig = toolConfigs.write as FormatterConfig;
registerToolFormatter('createFile', {
  ...writeConfig,
  displayName: 'Create',
});
```
