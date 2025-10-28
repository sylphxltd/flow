export function showDefaultHelp(): void {
  console.log('🚀 Sylphx Flow CLI - Type-safe development flow');
  console.log('=========================================');
  console.log('');
  console.log('Available commands:');
  console.log('  init       Initialize project with Sylphx Flow');
  console.log('  mcp        Manage MCP tools');
  console.log('  run        Run workflows and flows');
  console.log('  codebase   Search and analyze codebase');
  console.log('  knowledge  Manage knowledge base');
  console.log('');
  console.log('Examples:');
  console.log('  sylphx-flow init');
  console.log('  sylphx-flow init --target opencode');
  console.log('  sylphx-flow mcp install --all');
  console.log('  sylphx-flow codebase search "function"');
  console.log('  sylphx-flow knowledge search "React patterns"');
  console.log('');
  console.log('Run "sylphx-flow <command> --help" for more information about a command.');
}
