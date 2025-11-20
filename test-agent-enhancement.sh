#!/bin/bash
set -e

echo "🧪 Testing agent enhancement..."

# Test directory
TEST_DIR="/tmp/flow-enhancement-test-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Install current version from local source
echo "📦 Installing from local source..."
cd /Users/kyle/flow
bun install --frozen-lockfile
bun link

cd "$TEST_DIR"
bun link @sylphx/flow

# Create test project
mkdir -p .claude/agents

# Run init (skip interactive prompts)
echo "🚀 Running init..."
export SKIP_MCP=1
sylphx-flow --init-only --target claude-code --no-mcp 2>&1 | grep -v "?" || true

# Check if coder.md was created
if [ ! -f ".claude/agents/coder.md" ]; then
  echo "❌ FAIL: coder.md not created"
  exit 1
fi

# Get file stats
LINES=$(wc -l < .claude/agents/coder.md)
echo "📊 Agent file: $LINES lines"

# Check for required content
echo "🔍 Checking content..."

# Check frontmatter (should NOT have rules field)
if grep -q "^rules:" .claude/agents/coder.md; then
  echo "❌ FAIL: rules field should be stripped from output"
  exit 1
else
  echo "✓ rules field correctly stripped"
fi

# Check for core.md content
if grep -q "CORE RULES\|Identity" .claude/agents/coder.md; then
  echo "✓ core.md content found"
else
  echo "❌ FAIL: core.md content missing"
  exit 1
fi

# Check for code-standards.md content
if grep -q "Named args\|YAGNI\|DRY" .claude/agents/coder.md; then
  echo "✓ code-standards.md content found"
else
  echo "❌ FAIL: code-standards.md content missing"
  exit 1
fi

# Check for workspace.md content (THE CRITICAL TEST)
if grep -q "WORKSPACE\|\.sylphx/" .claude/agents/coder.md; then
  echo "✓ workspace.md content found"
else
  echo "❌ FAIL: workspace.md content missing"
  cat .claude/agents/coder.md | tail -100
  exit 1
fi

# Check for silent.md content
if grep -q "Silent Execution" .claude/agents/coder.md; then
  echo "✓ silent.md (output style) found"
else
  echo "❌ FAIL: silent.md content missing"
  exit 1
fi

echo ""
echo "✅ ALL TESTS PASSED"
echo "   - Frontmatter clean (no rules field)"
echo "   - core.md appended"
echo "   - code-standards.md appended"
echo "   - workspace.md appended ✓✓✓"
echo "   - silent.md appended"
echo "   - Total: $LINES lines"

# Cleanup
cd /
rm -rf "$TEST_DIR"
