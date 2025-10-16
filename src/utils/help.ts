export function showDefaultHelp(): void {
  console.log('🚀 Sylphx Flow CLI - Type-safe development flow');
  console.log('=========================================');
  console.log('');
  console.log('Available commands:');
  console.log('  sync     Sync development flow to your project');
  console.log('  install  Install workflow agents for OpenCode');
  console.log('  mcp      Start the MCP server');
  console.log('');
  console.log('Examples:');
  console.log('  sylphx-flow sync');
  console.log('  sylphx-flow mcp');
  console.log('  sylphx-flow sync --agent cursor');
  console.log('  sylphx-flow sync --dry-run');
  console.log('  sylphx-flow sync --clear');
  console.log('  sylphx-flow sync --merge');
  console.log('  sylphx-flow install --agent opencode');
  console.log('');
  console.log('Run "sylphx-flow <command> --help" for more information about a command.');
}
