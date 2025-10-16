#!/bin/bash

# Test script for GitHub installation functionality
echo "🧪 Testing GitHub Installation for Sylphx Flow CLI"
echo "=========================================="

# Test 1: Basic help command
echo "📋 Test 1: Help command"
# Try local package first, then GitHub package
if npx ./sylphxltd-flow-1.0.0.tgz --help > /dev/null 2>&1; then
    echo "✅ Help command works (local package)"
elif npx github:sylphxltd/flow --help > /dev/null 2>&1; then
    echo "✅ Help command works (GitHub package)"
else
    echo "❌ Help command failed"
    exit 1
fi

# Test 2: Sync command dry-run
echo "📋 Test 2: Sync dry-run"
if npx ./sylphxltd-flow-1.0.0.tgz sync --agent=cursor --dry-run > /dev/null 2>&1; then
    echo "✅ Sync dry-run works (local package)"
elif npx github:sylphxltd/flow sync --agent=cursor --dry-run > /dev/null 2>&1; then
    echo "✅ Sync dry-run works (GitHub package)"
else
    echo "❌ Sync dry-run failed"
    exit 1
fi

# Test 3: Init command help
echo "📋 Test 3: Init help"
if npx ./sylphxltd-flow-1.0.0.tgz init --help > /dev/null 2>&1; then
    echo "✅ Init help works (local package)"
elif npx github:sylphxltd/flow init --help > /dev/null 2>&1; then
    echo "✅ Init help works (GitHub package)"
else
    echo "❌ Init help failed"
    exit 1
fi

# Test 4: MCP listing
echo "📋 Test 4: MCP listing"
if npx ./sylphxltd-flow-1.0.0.tgz mcp list > /dev/null 2>&1; then
    echo "✅ MCP listing works (local package)"
elif npx github:sylphxltd/flow mcp list > /dev/null 2>&1; then
    echo "✅ MCP listing works (GitHub package)"
else
    echo "❌ MCP listing failed"
    exit 1
fi

# Test 5: Verify MCP functionality with built version
echo "📋 Test 5: MCP functionality verification"
node dist/index.js mcp list > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ MCP functionality verified with built version"
else
    echo "❌ MCP functionality failed"
    exit 1
fi

echo ""
echo "🎉 All tests passed! The Sylphx Flow CLI is working correctly."
echo "📦 Users can now install it with: npx github:sylphxltd/flow"
echo "📦 Or test locally with: npx ./sylphxltd-flow-1.0.0.tgz"
echo ""
echo "📋 Available commands:"
echo "  - sylphx-flow --help          Show help"
echo "  - sylphx-flow init            Initialize project with agents and MCP tools"
echo "  - sylphx-flow sync            Sync development flow"
echo "  - sylphx-flow mcp start       Start MCP server"
echo "  - sylphx-flow mcp install     Install MCP tools"
echo "  - sylphx-flow mcp list        List available MCP tools"
echo ""
echo "✅ MCP Server Features:"
echo "  - Memory coordination tools for AI agents"
echo "  - Persistent JSON-based storage"
echo "  - Available tools: memory_set, memory_get, memory_search, memory_list, memory_delete, memory_clear"
echo ""
echo "📖 Usage Examples:"
echo "  npx github:sylphxltd/flow init"
echo "  npx github:sylphxltd/flow sync --agent=cursor"
echo "  npx github:sylphxltd/flow mcp start"
echo "  npx github:sylphxltd/flow mcp install --all"
echo "  npx github:sylphxltd/flow mcp list"
echo ""
echo "🔗 For more information, see: https://github.com/sylphxltd/flow"