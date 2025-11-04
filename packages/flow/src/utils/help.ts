export function showDefaultHelp(): void {
  console.log('🚀 Sylphx Flow CLI - Legacy project initialization and flow management');
  console.log('=========================================');
  console.log('');
  console.log('Available commands:');
  console.log('  init       Initialize project with Sylphx Flow');
  console.log('  run        Run workflows and flows');
  console.log('  codebase   Search and analyze codebase');
  console.log('  knowledge  Manage knowledge base');
  console.log('  hook       Load dynamic content for hooks');
  console.log('');
  console.log('Examples:');
  console.log('  sylphx-flow init');
  console.log('  sylphx-flow init --target claude-code');
  console.log('  sylphx-flow run "your prompt"');
  console.log('  sylphx-flow codebase search "function"');
  console.log('  sylphx-flow knowledge search "React patterns"');
  console.log('');
  console.log('Run "sylphx-flow <command> --help" for more information about a command.');
}
