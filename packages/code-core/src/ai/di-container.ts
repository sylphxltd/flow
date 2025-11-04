/**
 * Lightweight Dependency Injection Container
 *
 * A minimal DI container focusing on core services: database, logging, configuration
 * Uses constructor injection pattern for better testability
 */

export type ServiceFactory<T> = () => T | Promise<T>;
export type ServiceLifetime = 'singleton' | 'transient' | 'scoped';

export interface ServiceDescriptor<T = any> {
  factory: ServiceFactory<T>;
  lifetime: ServiceLifetime;
  instance?: T;
  isResolved?: boolean;
}

export class DIContainer {
  private services = new Map<string, ServiceDescriptor>();
  private scopedInstances = new Map<string, any>();

  /**
   * Register a service with the container
   */
  register<T>(
    token: string,
    factory: ServiceFactory<T>,
    lifetime: ServiceLifetime = 'singleton'
  ): void {
    this.services.set(token, {
      factory,
      lifetime,
      isResolved: false,
    });
  }

  /**
   * Register a singleton instance
   */
  registerInstance<T>(token: string, instance: T): void {
    this.services.set(token, {
      factory: () => instance,
      lifetime: 'singleton',
      instance,
      isResolved: true,
    });
  }

  /**
   * Resolve a service from the container
   */
  async resolve<T>(token: string): Promise<T> {
    const descriptor = this.services.get(token);

    if (!descriptor) {
      throw new Error(`Service not registered: ${token}`);
    }

    switch (descriptor.lifetime) {
      case 'singleton':
        return this.resolveSingleton<T>(descriptor);
      case 'transient':
        return this.resolveTransient<T>(descriptor);
      case 'scoped':
        return this.resolveScoped<T>(token, descriptor);
      default:
        throw new Error(`Unsupported service lifetime: ${descriptor.lifetime}`);
    }
  }

  /**
   * Check if a service is registered
   */
  isRegistered(token: string): boolean {
    return this.services.has(token);
  }

  /**
   * Create a new scope for scoped services
   */
  createScope(): DIContainer {
    const scope = new DIContainer();
    // Copy all service descriptors but not instances
    for (const [token, descriptor] of this.services) {
      scope.services.set(token, { ...descriptor });
    }
    return scope;
  }

  /**
   * Clear scoped instances (useful for request cleanup)
   */
  clearScope(): void {
    this.scopedInstances.clear();
  }

  /**
   * Dispose all singleton services that have dispose method
   */
  async dispose(): Promise<void> {
    for (const descriptor of this.services.values()) {
      if (descriptor.instance && typeof descriptor.instance.dispose === 'function') {
        try {
          await descriptor.instance.dispose();
        } catch (error) {
          console.error('Error disposing service:', error);
        }
      }
    }
    this.services.clear();
    this.scopedInstances.clear();
  }

  private async resolveSingleton<T>(descriptor: ServiceDescriptor<T>): Promise<T> {
    if (descriptor.isResolved && descriptor.instance) {
      return descriptor.instance;
    }

    const instance = await descriptor.factory();
    descriptor.instance = instance;
    descriptor.isResolved = true;

    return instance;
  }

  private async resolveTransient<T>(descriptor: ServiceDescriptor<T>): Promise<T> {
    return await descriptor.factory();
  }

  private async resolveScoped<T>(token: string, descriptor: ServiceDescriptor<T>): Promise<T> {
    if (this.scopedInstances.has(token)) {
      return this.scopedInstances.get(token);
    }

    const instance = await descriptor.factory();
    this.scopedInstances.set(token, instance);

    return instance;
  }
}

// Global container instance
export const container = new DIContainer();

// Service tokens constants
export const SERVICE_TOKENS = {
  DATABASE: 'database',
  LOGGER: 'logger',
  CONFIG: 'config',
  MEMORY_STORAGE: 'memoryStorage',
  SEARCH_SERVICE: 'searchService',
  MCP_SERVICE: 'mcpService',
  EMBEDDING_PROVIDER: 'embeddingProvider',
  TARGET_MANAGER: 'targetManager',
} as const;
