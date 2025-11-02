# Tool Display System

Simple, unified API for configuring tool display.

## Basic Usage

### Default Display (Formatters)

For most tools, just define how to format args and results:

```ts
import { registerTool } from '../ui/utils/tool-configs.js';

registerTool('myTool', {
  displayName: 'My Tool',
  formatArgs: (args) => `Processing ${args.filename}`,
  formatResult: (result) => ({
    lines: ['Line 1', 'Line 2'],
    summary: 'Processed 2 items',
  }),
});
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

registerTool('myTool', { component: MyCustomToolDisplay });
```

## Built-in Tools Configuration

All built-in tools are pre-configured in `src/ui/utils/tool-configs.ts`:

```ts
export const toolConfigs: Record<string, ToolConfig> = {
  read: {
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
  component: MyCustomReadDisplay,
}
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
bash: {
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

registerTool('generateImage', { component: ImageToolDisplay });
```

### Reuse formatters with different names:

```ts
import { toolConfigs, registerTool } from '../ui/utils/tool-configs.js';

// Clone existing config but with different name
const writeConfig = toolConfigs.write;
registerTool('createFile', {
  ...writeConfig,
  displayName: 'Create',
});
```
