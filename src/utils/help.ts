export function showDefaultHelp(): void {
  console.log('🚀 Rules CLI - Type-safe development rules');
  console.log('==========================================');
  console.log('');
  console.log('Available commands:');
  console.log('  sync     Sync development rules to your project');
  console.log('  install  Install workflow agents for OpenCode');
  console.log('  mcp      Start the MCP server');
  console.log('');
  console.log('Examples:');
  console.log('  rules sync');
  console.log('  rules mcp');
  console.log('  rules sync --agent cursor');
  console.log('  rules sync --dry-run');
  console.log('  rules sync --clear');
  console.log('  rules sync --merge');
  console.log('  rules install --agent opencode');
  console.log('');
  console.log('Run "rules <command> --help" for more information about a command.');
}