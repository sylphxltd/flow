/**
 * CLI Invocation Detection
 * Detects how the CLI was invoked and generates appropriate commands
 *
 * Supports common invocation methods:
 * - npm/npx (most common)
 * - GitHub direct (for bleeding edge)
 * - Bun/bunx (emerging)
 * - Local development (bun/npm run dev)
 * - Global installation
 * - Unknown methods fallback to npm (safe default)
 */

/**
 * Invocation method types
 */
export type InvocationMethod =
  | { type: 'npm'; package: string }
  | { type: 'github'; repo: string }
  | { type: 'bunx'; package: string }
  | { type: 'local-dev'; script: string }
  | { type: 'global'; command: string }
  | { type: 'unknown' };

/**
 * Detect how the CLI was invoked
 * Examines process.argv to determine invocation method
 */
export const detectInvocation = (): InvocationMethod => {
  const argv = process.argv;
  const execPath = argv[0]; // node/bun executable path
  const scriptPath = argv[1]; // script being executed

  // Check if running via npx with github
  if (scriptPath.includes('/_npx/') && scriptPath.includes('github')) {
    return { type: 'github', repo: 'github:sylphxltd/flow' };
  }

  // Check if running via npx with npm package
  if (scriptPath.includes('/_npx/')) {
    // Extract package name from path
    const match = scriptPath.match(/@sylphx\/flow|@sylphxltd\/flow/);
    return { type: 'npm', package: match ? match[0] : '@sylphx/flow' };
  }

  // Check if running via bunx (bun's cache directory)
  // Note: bunx uses #!/usr/bin/env node shebang, so execPath won't be bun
  // Instead, check for bun's install cache directory structure
  if (
    scriptPath.includes('/.bun/install/cache/') ||
    scriptPath.includes('/bun/install/cache/')
  ) {
    return { type: 'bunx', package: '@sylphx/flow' };
  }

  // Check if running via bunx (old detection using execPath)
  if (execPath.includes('bun') && !scriptPath.includes(process.cwd())) {
    return { type: 'bunx', package: '@sylphx/flow' };
  }

  // Check if running locally in development
  if (scriptPath.includes(process.cwd())) {
    // Check if using bun run dev or npm run dev
    if (execPath.includes('bun')) {
      return { type: 'local-dev', script: 'bun run dev' };
    }
    return { type: 'local-dev', script: 'npm run dev' };
  }

  // Check if globally installed
  if (scriptPath.includes('node_modules/.bin') || scriptPath.includes('/bin/sylphx-flow')) {
    return { type: 'global', command: 'sylphx-flow' };
  }

  return { type: 'unknown' };
};

/**
 * Generate command prefix based on invocation method
 * Used for generating hook commands, MCP configs, etc.
 */
export const getCommandPrefix = (method?: InvocationMethod): string => {
  const invocation = method || detectInvocation();

  switch (invocation.type) {
    case 'npm':
      return `npx -y ${invocation.package}`;

    case 'github':
      return `npx -y ${invocation.repo}`;

    case 'bunx':
      return `bunx ${invocation.package}`;

    case 'local-dev':
      return invocation.script;

    case 'global':
      return invocation.command;

    case 'unknown':
      // Fallback to npm package (safe default)
      return 'npx -y @sylphx/flow';
  }
};

/**
 * Generate MCP server args array based on invocation
 */
export const getMCPServerArgs = (method?: InvocationMethod): string[] => {
  const invocation = method || detectInvocation();

  switch (invocation.type) {
    case 'npm':
      return ['-y', invocation.package, 'mcp', 'start'];

    case 'github':
      return ['-y', invocation.repo, 'mcp', 'start'];

    case 'bunx':
      return [invocation.package, 'mcp', 'start'];

    case 'local-dev':
      // For local dev, use the built dist
      return ['./dist/index.js', 'mcp', 'start'];

    case 'global':
      return [invocation.command, 'mcp', 'start'];

    case 'unknown':
      // Fallback to npm
      return ['-y', '@sylphx/flow', 'mcp', 'start'];
  }
};

/**
 * Get MCP server command based on invocation
 */
export const getMCPServerCommand = (method?: InvocationMethod): string => {
  const invocation = method || detectInvocation();

  switch (invocation.type) {
    case 'npm':
    case 'github':
      return 'npx';

    case 'bunx':
      return 'bunx';

    case 'local-dev':
      // Use node or bun depending on what's running
      return process.execPath.includes('bun') ? 'bun' : 'node';

    case 'global':
    case 'unknown':
      return 'npx';
  }
};

/**
 * Generate hook command for specific hook type
 */
export const generateHookCommand = (
  hookType: 'session' | 'message' | 'notification',
  targetId: string,
  method?: InvocationMethod
): string => {
  const prefix = getCommandPrefix(method);
  return `${prefix} hook --type ${hookType} --target ${targetId}`;
};

/**
 * Save invocation method to settings for future use
 */
export const saveInvocationMethod = async (method: InvocationMethod): Promise<void> => {
  const { updateSettings } = await import('./settings.js');
  await updateSettings({
    invocationMethod: method as any,
  });
};

/**
 * Load saved invocation method from settings
 */
export const loadInvocationMethod = async (): Promise<InvocationMethod | undefined> => {
  const { loadSettings } = await import('./settings.js');
  const result = await loadSettings();
  if (result._tag === 'Success') {
    return (result.value as any).invocationMethod;
  }
  return undefined;
};
