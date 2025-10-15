# MCP Server Configuration Implementation Summary

## Overview

Enhanced the install command to support automatic configuration of MCP (Model Context Protocol) servers in `opencode.jsonc`. This implementation provides a seamless way to install and manage MCP servers for OpenCode.

## Features Implemented

### 1. New Command Line Option
- Added `--mcp [servers...]` option to the install command
- Supports installing multiple servers in one command
- Supports listing current servers when used without arguments

### 2. Supported MCP Servers
- **memory**: `rules_memory` - Rules memory MCP server for agent coordination
  - Command: `["npx", "github:sylphxltd/rules", "mcp"]`
- **everything**: `mcp_everything` - MCP Everything server with comprehensive tool collection
  - Command: `["npx", "-y", "@modelcontextprotocol/server-everything"]`

### 3. JSONC Configuration Management
- Automatic creation and updates of `opencode.jsonc`
- Proper JSONC format with comments support
- Schema validation with `https://opencode.ai/config.json`
- Robust parsing that handles comments and trailing commas

### 4. Configuration Format
```jsonc
{
  // MCP (Model Context Protocol) server configuration
  // See https://modelcontextprotocol.io for more information
  
  "mcp": {
    "rules_memory": {
      "type": "local",
      "command": ["npx", "github:sylphxltd/rules", "mcp"]
    },
    "mcp_everything": {
      "type": "local", 
      "command": ["npx", "-y", "@modelcontextprotocol/server-everything"]
    }
  },
  "$schema": "https://opencode.ai/config.json"
}
```

## Usage Examples

### Install MCP Servers
```bash
# Install a single server
rules install --mcp memory

# Install multiple servers
rules install --mcp memory everything

# Install agents and MCP servers together
rules install --mcp memory everything --clear
```

### List Configured Servers
```bash
# List all configured MCP servers
rules install --mcp
```

### Dry Run Testing
```bash
# Test what would be installed
rules install --mcp memory --dry-run
```

## Implementation Details

### New Files Created
1. **`src/utils/jsonc.ts`** - JSONC parsing and stringification utilities
2. **`src/utils/mcp-config.ts`** - MCP server configuration management

### Modified Files
1. **`src/types.ts`** - Added MCP-related types and options
2. **`src/utils/command-builder.ts`** - Added MCP option to common options
3. **`src/commands/install-command.ts`** - Enhanced to handle MCP installation
4. **`src/shared.ts`** - Updated CommonOptions interface

### Key Features
- **Idempotent Operations**: Adding an already configured server shows a message but doesn't error
- **Validation**: Validates server names and provides helpful error messages
- **Dry Run Support**: Respects `--dry-run` flag for MCP operations
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Comment Preservation**: Maintains comments in JSONC files
- **Schema Support**: Automatically includes OpenCode schema URL

## Error Handling

### Invalid Server Names
```
Warning: Unknown MCP server 'invalid'. Available: memory, everything
❌ Error (install): Invalid MCP servers. Available: memory, everything
```

### Already Configured Servers
```
ℹ️  MCP server already exists: rules_memory
✅ Updated opencode.jsonc with 0 new MCP server(s)
```

### Dry Run Mode
```
🔍 Dry run: Would install MCP servers: memory, everything
```

## Testing

The implementation has been thoroughly tested with:
- Single server installation
- Multiple server installation
- Duplicate server handling
- Invalid server name validation
- Dry run functionality
- JSONC parsing with comments
- Configuration listing

## Future Enhancements

Potential future improvements could include:
- Support for additional MCP servers
- Server removal functionality (`--mcp-remove`)
- Custom server configuration
- Server health checking
- Configuration validation
- Integration with MCP server discovery

## Compatibility

- Fully compatible with existing install command functionality
- Maintains backward compatibility
- Works with all existing install options (`--agent`, `--clear`, `--merge`, etc.)
- Supports dry-run mode
- Integrates seamlessly with existing error handling

This implementation provides a robust foundation for MCP server management in OpenCode while maintaining the simplicity and reliability of the existing install command.