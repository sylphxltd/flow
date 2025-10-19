import fs from 'node:fs/promises';
import path from 'node:path';
import {
  TARGET_REGISTRY,
  type TargetID,
  getAllTargetIDs,
  getDefaultTarget,
  getImplementedTargetIDs,
  getTargetDefinition,
  getTargetsWithMCPSupport,
  isTargetImplemented,
  isValidTargetID,
} from '../config/targets.js';
import type { TargetConfig, TargetTransformer } from '../types.js';

/**
 * Target manager for handling different development environment targets
 */
export class TargetManager {
  private transformers: Map<TargetID, TargetTransformer> = new Map();

  private initialized = false;

  constructor() {
    // Initialize transformers asynchronously
    this.initializeDefaultTransformers().catch((error) => {
      console.error('Failed to initialize transformers:', error);
    });
  }

  /**
   * Ensure transformers are initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      // Wait a bit for async initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!this.initialized) {
        // Fallback: initialize synchronously
        await this.initializeDefaultTransformers();
      }
    }
  }

  /**
   * Initialize default transformers for implemented targets
   */
  private async initializeDefaultTransformers(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Import transformers dynamically to avoid circular dependencies
      const { OpenCodeTransformer } = await import('../transformers/opencode.js');
      const { ClaudeCodeTransformer } = await import('../transformers/claude-code.js');
      const { CursorTransformer } = await import('../transformers/cursor.js');
      const { VSCodeTransformer } = await import('../transformers/vscode.js');

      // Register transformers for implemented targets
      this.registerTransformer(
        'opencode',
        new OpenCodeTransformer(getTargetDefinition('opencode').config)
      );

      this.registerTransformer(
        'claude-code',
        new ClaudeCodeTransformer(getTargetDefinition('claude-code').config)
      );

      // Register future transformers (not implemented yet)
      // this.registerTransformer('cursor', new CursorTransformer(getTargetDefinition('cursor').config));
      // this.registerTransformer('vscode', new VSCodeTransformer(getTargetDefinition('vscode').config));

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize transformers:', error);
      throw error;
    }
  }

  /**
   * Register a transformer for a target
   */
  registerTransformer(targetId: TargetID, transformer: TargetTransformer): void {
    this.transformers.set(targetId, transformer);
  }

  /**
   * Get transformer for a target
   */
  async getTransformer(targetId: TargetID): Promise<TargetTransformer | undefined> {
    await this.ensureInitialized();
    return this.transformers.get(targetId);
  }

  /**
   * Get all available targets
   */
  getAvailableTargets(): TargetID[] {
    return getAllTargetIDs();
  }

  /**
   * Get implemented targets only
   */
  getImplementedTargets(): TargetID[] {
    return getImplementedTargetIDs();
  }

  /**
   * Get targets that support MCP servers
   */
  getTargetsWithMCPSupport(): TargetID[] {
    return getTargetsWithMCPSupport();
  }

  /**
   * Get default target
   */
  getDefaultTarget(): TargetID {
    return getDefaultTarget();
  }

  /**
   * Validate target ID
   */
  validateTarget(targetId: string): TargetID {
    if (!isValidTargetID(targetId)) {
      const available = this.getAvailableTargets();
      throw new Error(`Invalid target '${targetId}'. Available targets: ${available.join(', ')}`);
    }

    if (!isTargetImplemented(targetId)) {
      throw new Error(
        `Target '${targetId}' is not yet implemented. Available targets: ${this.getImplementedTargets().join(', ')}`
      );
    }

    return targetId as TargetID;
  }

  /**
   * Resolve target from options or detection
   */
  async resolveTarget(options: { target?: string | null }): Promise<TargetID> {
    // If target is explicitly specified, use it
    if (options.target) {
      return this.validateTarget(options.target);
    }

    // Try to detect target from current directory
    const detectedTarget = await this.detectTarget();
    if (detectedTarget) {
      return detectedTarget;
    }

    // Fall back to default target
    return this.getDefaultTarget();
  }

  /**
   * Detect target from current directory structure
   */
  async detectTarget(): Promise<TargetID | null> {
    const cwd = process.cwd();

    // Check for target-specific files/directories
    const targetChecks: Array<{ target: TargetID; check: () => Promise<boolean> }> = [
      {
        target: 'opencode',
        check: async () => {
          const configPath = path.join(cwd, 'opencode.jsonc');
          const agentDir = path.join(cwd, '.opencode');
          const configExists = await fs
            .access(configPath)
            .then(() => true)
            .catch(() => false);
          const agentDirExists = await fs
            .access(agentDir)
            .then(() => true)
            .catch(() => false);
          return configExists || agentDirExists;
        },
      },
      {
        target: 'cursor',
        check: async () => {
          const configPath = path.join(cwd, 'cursor.json');
          const agentDir = path.join(cwd, '.cursor');
          const configExists = await fs
            .access(configPath)
            .then(() => true)
            .catch(() => false);
          const agentDirExists = await fs
            .access(agentDir)
            .then(() => true)
            .catch(() => false);
          return configExists || agentDirExists;
        },
      },
      {
        target: 'vscode',
        check: async () => {
          const configPath = path.join(cwd, '.vscode', 'settings.json');
          return fs
            .access(configPath)
            .then(() => true)
            .catch(() => false);
        },
      },
      {
        target: 'cli',
        check: async () => {
          const configPath = path.join(cwd, 'sylphx.json');
          const agentDir = path.join(cwd, '.sylphx');
          const configExists = await fs
            .access(configPath)
            .then(() => true)
            .catch(() => false);
          const agentDirExists = await fs
            .access(agentDir)
            .then(() => true)
            .catch(() => false);
          return configExists || agentDirExists;
        },
      },
      {
        target: 'claude-code',
        check: async () => {
          const configPath = path.join(cwd, '.mcp.json');
          const agentDir = path.join(cwd, '.claude');
          const configExists = await fs
            .access(configPath)
            .then(() => true)
            .catch(() => false);
          const agentDirExists = await fs
            .access(agentDir)
            .then(() => true)
            .catch(() => false);
          return configExists || agentDirExists;
        },
      },
    ];

    for (const { target, check } of targetChecks) {
      if (isTargetImplemented(target) && (await check())) {
        return target;
      }
    }

    return null;
  }

  /**
   * Get target configuration
   */
  getTargetConfig(targetId: TargetID): TargetConfig {
    const target = getTargetDefinition(targetId);
    return target.config;
  }

  /**
   * Get target definition
   */
  getTargetDefinition(targetId: TargetID) {
    return getTargetDefinition(targetId);
  }

  /**
   * Check if target supports MCP servers
   */
  supportsMCPServers(targetId: TargetID): boolean {
    const config = this.getTargetConfig(targetId);
    return config.installation.supportedMcpServers;
  }

  /**
   * Get agent directory path for target
   */
  getAgentDirectory(targetId: TargetID, cwd: string = process.cwd()): string {
    const config = this.getTargetConfig(targetId);
    return path.join(cwd, config.agentDir);
  }

  /**
   * Get configuration file path for target
   */
  getConfigFilePath(targetId: TargetID, cwd: string = process.cwd()): string {
    const config = this.getTargetConfig(targetId);
    return path.join(cwd, config.configFile);
  }

  /**
   * Get help text for all targets
   */
  getTargetsHelpText(): string {
    const implemented = this.getImplementedTargets();

    if (implemented.length === 0) {
      return 'No targets are currently implemented.';
    }

    let help = 'Available targets:\n';

    for (const targetId of implemented) {
      const target = getTargetDefinition(targetId);
      const isDefault = targetId === this.getDefaultTarget();
      const defaultMarker = isDefault ? ' (default)' : '';
      help += `  ${targetId}${defaultMarker} - ${target.description}\n`;
    }

    return help;
  }

  /**
   * Get help text for a specific target
   */
  async getTargetHelpText(targetId: TargetID): Promise<string> {
    const target = getTargetDefinition(targetId);
    const transformer = await this.getTransformer(targetId);

    let help = `${target.name} (${targetId})\n`;
    help += `${target.description}\n\n`;

    help += 'Configuration:\n';
    help += `  Agent Directory: ${target.config.agentDir}\n`;
    help += `  Agent Extension: ${target.config.agentExtension}\n`;
    help += `  Agent Format: ${target.config.agentFormat}\n`;
    help += `  Config File: ${target.config.configFile}\n`;
    help += `  MCP Support: ${target.config.installation.supportedMcpServers ? 'Yes' : 'No'}\n\n`;

    if (transformer) {
      help += transformer.getHelpText();
    }

    return help;
  }
}

// Singleton instance
export const targetManager = new TargetManager();
