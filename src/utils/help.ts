export function showDefaultHelp(): void {
  console.log('🚀 Sylphx Flow CLI - Type-safe development flow');
  console.log('=========================================');
  console.log('');
  console.log('Available commands:');
  console.log('  init     Initialize project with Sylphx Flow');
  console.log('  mcp      Manage MCP tools');
  console.log('  memory   Manage memory storage');
  console.log('  tui      Interactive TUI for all operations');
  console.log('');
  console.log('Examples:');
  console.log('  sylphx-flow init');
  console.log('  sylphx-flow init --target opencode');
  console.log('  sylphx-flow mcp install --all');
  console.log('  sylphx-flow memory set key value');
  console.log('  sylphx-flow tui');
  console.log('');
  console.log('Run "sylphx-flow <command> --help" for more information about a command.');
}
