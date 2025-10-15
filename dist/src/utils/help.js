export function showDefaultHelp() {
    console.log('🚀 Flow CLI - Type-safe development flow');
    console.log('=========================================');
    console.log('');
    console.log('Available commands:');
    console.log('  sync     Sync development flow to your project');
    console.log('  install  Install workflow agents for OpenCode');
    console.log('  mcp      Start the MCP server');
    console.log('');
    console.log('Examples:');
    console.log('  flow sync');
    console.log('  flow mcp');
    console.log('  flow sync --agent cursor');
    console.log('  flow sync --dry-run');
    console.log('  flow sync --clear');
    console.log('  flow sync --merge');
    console.log('  flow install --agent opencode');
    console.log('');
    console.log('Run "flow <command> --help" for more information about a command.');
}
