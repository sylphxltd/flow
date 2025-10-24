/**
 * Database Connection Pool
 *
 * Manages a pool of database connections for better performance and resource management
 */

export interface ConnectionConfig {
  maxConnections?: number;
  minConnections?: number;
  acquireTimeout?: number;
  idleTimeout?: number;
  maxLifetime?: number;
  healthCheckInterval?: number;
}

export interface Connection<T = any> {
  id: string;
  instance: T;
  createdAt: number;
  lastUsed: number;
  isInUse: boolean;
  isHealthy: boolean;
}

export class ConnectionPool<T> {
  private connections = new Map<string, Connection<T>>();
  private availableConnections: string[] = [];
  private connectionCount = 0;
  private healthCheckTimer?: NodeJS.Timeout;
  private isDisposing = false;

  constructor(
    private readonly createConnection: () => Promise<T>,
    private readonly destroyConnection: (connection: T) => Promise<void>,
    private readonly healthCheck: (connection: T) => Promise<boolean>,
    private readonly config: ConnectionConfig = {}
  ) {
    this.config = {
      maxConnections: 10,
      minConnections: 2,
      acquireTimeout: 30000,
      idleTimeout: 300000,
      maxLifetime: 3600000,
      healthCheckInterval: 60000,
      ...config,
    };

    this.startHealthCheck();
    this.initializeMinConnections();
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<T> {
    if (this.isDisposing) {
      throw new Error('Connection pool is disposing');
    }

    // Try to get an available connection
    while (this.availableConnections.length > 0) {
      const connectionId = this.availableConnections.shift()!;
      const connection = this.connections.get(connectionId)!;

      if (this.isConnectionValid(connection)) {
        connection.isInUse = true;
        connection.lastUsed = Date.now();
        return connection.instance;
      } else {
        // Remove invalid connection
        this.connections.delete(connectionId);
        this.connectionCount--;
        await this.destroyConnection(connection.instance);
      }
    }

    // Create new connection if under limit
    if (this.connectionCount < this.config.maxConnections!) {
      return await this.createNewConnection();
    }

    // Wait for a connection to become available
    return await this.waitForConnection();
  }

  /**
   * Release a connection back to the pool
   */
  async release(connectionInstance: T): Promise<void> {
    for (const [id, connection] of this.connections) {
      if (connection.instance === connectionInstance) {
        connection.isInUse = false;
        connection.lastUsed = Date.now();
        this.availableConnections.push(id);
        return;
      }
    }

    // Connection not found in pool, destroy it
    await this.destroyConnection(connectionInstance);
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const activeConnections = Array.from(this.connections.values()).filter(c => c.isInUse).length;
    const idleConnections = this.availableConnections.length;
    const unhealthyConnections = Array.from(this.connections.values()).filter(c => !c.isHealthy).length;

    return {
      totalConnections: this.connectionCount,
      activeConnections,
      idleConnections,
      unhealthyConnections,
      maxConnections: this.config.maxConnections,
      minConnections: this.config.minConnections,
    };
  }

  /**
   * Close all connections and dispose the pool
   */
  async dispose(): Promise<void> {
    this.isDisposing = true;

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    const destroyPromises = Array.from(this.connections.values()).map(async (connection) => {
      try {
        await this.destroyConnection(connection.instance);
      } catch (error) {
        console.error('Error destroying connection during pool disposal:', error);
      }
    });

    await Promise.all(destroyPromises);

    this.connections.clear();
    this.availableConnections = [];
    this.connectionCount = 0;

    console.log('Connection pool disposed');
  }

  /**
   * Create a new connection
   */
  private async createNewConnection(): Promise<T> {
    const startTime = Date.now();
    const connectionInstance = await this.createConnection();
    const createTime = Date.now() - startTime;

    const connection: Connection<T> = {
      id: this.generateConnectionId(),
      instance: connectionInstance,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      isInUse: true,
      isHealthy: true,
    };

    this.connections.set(connection.id, connection);
    this.connectionCount++;

    console.debug(`New connection created in ${createTime}ms, total connections: ${this.connectionCount}`);
    return connectionInstance;
  }

  /**
   * Wait for a connection to become available
   */
  private async waitForConnection(): Promise<T> {
    const timeout = this.config.acquireTimeout || 30000;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.isDisposing) {
          clearInterval(checkInterval);
          reject(new Error('Connection pool is disposing'));
          return;
        }

        if (this.availableConnections.length > 0) {
          clearInterval(checkInterval);
          const connectionId = this.availableConnections.shift()!;
          const connection = this.connections.get(connectionId)!;

          if (this.isConnectionValid(connection)) {
            connection.isInUse = true;
            connection.lastUsed = Date.now();
            resolve(connection.instance);
          } else {
            // Remove invalid connection and try again
            this.connections.delete(connectionId);
            this.connectionCount--;
            this.destroyConnection(connection.instance).catch(console.error);
            return;
          }
        }

        // Check timeout
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error('Connection acquire timeout'));
        }
      }, 100);
    });
  }

  /**
   * Check if a connection is valid
   */
  private isConnectionValid(connection: Connection<T>): boolean {
    const now = Date.now();

    // Check age
    if (now - connection.createdAt > (this.config.maxLifetime || 3600000)) {
      return false;
    }

    // Check if it's idle for too long (but only if not in use)
    if (!connection.isInUse && now - connection.lastUsed > (this.config.idleTimeout || 300000)) {
      return false;
    }

    // Check health
    return connection.isHealthy;
  }

  /**
   * Start health check timer
   */
  private startHealthCheck(): void {
    const interval = this.config.healthCheckInterval || 60000;

    this.healthCheckTimer = setInterval(async () => {
      if (this.isDisposing) return;

      for (const [id, connection] of this.connections) {
        try {
          const isHealthy = await this.healthCheck(connection.instance);

          if (!isHealthy) {
            connection.isHealthy = false;
            console.warn(`Connection ${id} failed health check`);

            // Remove unhealthy connection if not in use
            if (!connection.isInUse) {
              this.connections.delete(id);
              this.connectionCount--;
              const index = this.availableConnections.indexOf(id);
              if (index > -1) {
                this.availableConnections.splice(index, 1);
              }
              await this.destroyConnection(connection.instance);
            }
          } else {
            connection.isHealthy = true;
          }
        } catch (error) {
          console.error(`Health check failed for connection ${id}:`, error);
          connection.isHealthy = false;
        }
      }

      // Maintain minimum connections
      await this.maintainMinConnections();
    }, interval);
  }

  /**
   * Initialize minimum connections
   */
  private async initializeMinConnections(): Promise<void> {
    const minConnections = this.config.minConnections || 2;
    const promises = [];

    for (let i = 0; i < minConnections; i++) {
      promises.push(
        this.createNewConnection()
          .then(connection => this.release(connection))
          .catch(error => console.error('Failed to initialize minimum connection:', error))
      );
    }

    await Promise.all(promises);
  }

  /**
   * Maintain minimum connections
   */
  private async maintainMinConnections(): Promise<void> {
    const minConnections = this.config.minConnections || 2;
    const availableCount = this.availableConnections.length;

    if (availableCount < minConnections && this.connectionCount < this.config.maxConnections!) {
      const needed = minConnections - availableCount;
      for (let i = 0; i < needed; i++) {
        this.createNewConnection()
          .then(connection => this.release(connection))
          .catch(error => console.error('Failed to maintain minimum connection:', error));
      }
    }
  }

  /**
   * Generate a unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create a connection pool for database connections
 */
export function createDatabaseConnectionPool(
  createDbConnection: () => Promise<any>,
  destroyDbConnection: (connection: any) => Promise<void>,
  healthCheckFn: (connection: any) => Promise<boolean>,
  config?: ConnectionConfig
): ConnectionPool<any> {
  return new ConnectionPool(
    createDbConnection,
    destroyDbConnection,
    healthCheckFn,
    config
  );
}