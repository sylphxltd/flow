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

export interface ConnectionPoolInstance<T> {
  acquire(): Promise<T>;
  release(connectionInstance: T): Promise<void>;
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    unhealthyConnections: number;
    maxConnections?: number;
    minConnections?: number;
  };
  dispose(): Promise<void>;
}

/**
 * Create a connection pool for database connections
 */
export function createConnectionPool<T>(
  createConnection: () => Promise<T>,
  destroyConnection: (connection: T) => Promise<void>,
  healthCheck: (connection: T) => Promise<boolean>,
  configInput: ConnectionConfig = {}
): ConnectionPoolInstance<T> {
  // Closure-based state
  const connections = new Map<string, Connection<T>>();
  let availableConnections: string[] = [];
  let connectionCount = 0;
  let healthCheckTimer: NodeJS.Timeout | undefined;
  let isDisposing = false;

  const config: Required<ConnectionConfig> = {
    maxConnections: 10,
    minConnections: 2,
    acquireTimeout: 30000,
    idleTimeout: 300000,
    maxLifetime: 3600000,
    healthCheckInterval: 60000,
    ...configInput,
  };

  /**
   * Generate a unique connection ID
   */
  const generateConnectionId = (): string => {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Check if a connection is valid
   */
  const isConnectionValid = (connection: Connection<T>): boolean => {
    const now = Date.now();

    // Check age
    if (now - connection.createdAt > config.maxLifetime) {
      return false;
    }

    // Check if it's idle for too long (but only if not in use)
    if (!connection.isInUse && now - connection.lastUsed > config.idleTimeout) {
      return false;
    }

    // Check health
    return connection.isHealthy;
  };

  /**
   * Create a new connection
   */
  const createNewConnection = async (): Promise<T> => {
    const startTime = Date.now();
    const connectionInstance = await createConnection();
    const createTime = Date.now() - startTime;

    const connection: Connection<T> = {
      id: generateConnectionId(),
      instance: connectionInstance,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      isInUse: true,
      isHealthy: true,
    };

    connections.set(connection.id, connection);
    connectionCount++;

    console.debug(
      `New connection created in ${createTime}ms, total connections: ${connectionCount}`
    );
    return connectionInstance;
  };

  /**
   * Wait for a connection to become available
   */
  const waitForConnection = async (): Promise<T> => {
    const timeout = config.acquireTimeout;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (isDisposing) {
          clearInterval(checkInterval);
          reject(new Error('Connection pool is disposing'));
          return;
        }

        if (availableConnections.length > 0) {
          clearInterval(checkInterval);
          const connectionId = availableConnections.shift()!;
          const connection = connections.get(connectionId)!;

          if (isConnectionValid(connection)) {
            connection.isInUse = true;
            connection.lastUsed = Date.now();
            resolve(connection.instance);
          } else {
            // Remove invalid connection and try again
            connections.delete(connectionId);
            connectionCount--;
            destroyConnection(connection.instance).catch(console.error);
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
  };

  /**
   * Maintain minimum connections
   */
  const maintainMinConnections = async (): Promise<void> => {
    const minConnections = config.minConnections;
    const availableCount = availableConnections.length;

    if (availableCount < minConnections && connectionCount < config.maxConnections) {
      const needed = minConnections - availableCount;
      for (let i = 0; i < needed; i++) {
        createNewConnection()
          .then((connection) => release(connection))
          .catch((error) => console.error('Failed to maintain minimum connection:', error));
      }
    }
  };

  /**
   * Start health check timer
   */
  const startHealthCheck = (): void => {
    const interval = config.healthCheckInterval;

    healthCheckTimer = setInterval(async () => {
      if (isDisposing) {
        return;
      }

      for (const [id, connection] of connections) {
        try {
          const isHealthy = await healthCheck(connection.instance);

          if (isHealthy) {
            connection.isHealthy = true;
          } else {
            connection.isHealthy = false;
            console.warn(`Connection ${id} failed health check`);

            // Remove unhealthy connection if not in use
            if (!connection.isInUse) {
              connections.delete(id);
              connectionCount--;
              const index = availableConnections.indexOf(id);
              if (index > -1) {
                availableConnections.splice(index, 1);
              }
              await destroyConnection(connection.instance);
            }
          }
        } catch (error) {
          console.error(`Health check failed for connection ${id}:`, error);
          connection.isHealthy = false;
        }
      }

      // Maintain minimum connections
      await maintainMinConnections();
    }, interval);
  };

  /**
   * Initialize minimum connections
   */
  const initializeMinConnections = async (): Promise<void> => {
    const minConnections = config.minConnections;
    const promises = [];

    for (let i = 0; i < minConnections; i++) {
      promises.push(
        createNewConnection()
          .then((connection) => release(connection))
          .catch((error) => console.error('Failed to initialize minimum connection:', error))
      );
    }

    await Promise.all(promises);
  };

  /**
   * Acquire a connection from the pool
   */
  const acquire = async (): Promise<T> => {
    if (isDisposing) {
      throw new Error('Connection pool is disposing');
    }

    // Try to get an available connection
    while (availableConnections.length > 0) {
      const connectionId = availableConnections.shift()!;
      const connection = connections.get(connectionId)!;

      if (isConnectionValid(connection)) {
        connection.isInUse = true;
        connection.lastUsed = Date.now();
        return connection.instance;
      }
      // Remove invalid connection
      connections.delete(connectionId);
      connectionCount--;
      await destroyConnection(connection.instance);
    }

    // Create new connection if under limit
    if (connectionCount < config.maxConnections) {
      return await createNewConnection();
    }

    // Wait for a connection to become available
    return await waitForConnection();
  };

  /**
   * Release a connection back to the pool
   */
  const release = async (connectionInstance: T): Promise<void> => {
    for (const [id, connection] of connections) {
      if (connection.instance === connectionInstance) {
        connection.isInUse = false;
        connection.lastUsed = Date.now();
        availableConnections.push(id);
        return;
      }
    }

    // Connection not found in pool, destroy it
    await destroyConnection(connectionInstance);
  };

  /**
   * Get pool statistics
   */
  const getStats = () => {
    const activeConnections = Array.from(connections.values()).filter((c) => c.isInUse).length;
    const idleConnections = availableConnections.length;
    const unhealthyConnections = Array.from(connections.values()).filter(
      (c) => !c.isHealthy
    ).length;

    return {
      totalConnections: connectionCount,
      activeConnections,
      idleConnections,
      unhealthyConnections,
      maxConnections: config.maxConnections,
      minConnections: config.minConnections,
    };
  };

  /**
   * Close all connections and dispose the pool
   */
  const dispose = async (): Promise<void> => {
    isDisposing = true;

    if (healthCheckTimer) {
      clearInterval(healthCheckTimer);
      healthCheckTimer = undefined;
    }

    const destroyPromises = Array.from(connections.values()).map(async (connection) => {
      try {
        await destroyConnection(connection.instance);
      } catch (error) {
        console.error('Error destroying connection during pool disposal:', error);
      }
    });

    await Promise.all(destroyPromises);

    connections.clear();
    availableConnections = [];
    connectionCount = 0;

    console.log('Connection pool disposed');
  };

  // Initialize pool
  startHealthCheck();
  initializeMinConnections();

  return {
    acquire,
    release,
    getStats,
    dispose,
  };
}

/**
 * @deprecated Use createConnectionPool() for new code
 */
export class ConnectionPool<T> {
  private instance: ConnectionPoolInstance<T>;

  constructor(
    createConnection: () => Promise<T>,
    destroyConnection: (connection: T) => Promise<void>,
    healthCheck: (connection: T) => Promise<boolean>,
    config: ConnectionConfig = {}
  ) {
    this.instance = createConnectionPool(createConnection, destroyConnection, healthCheck, config);
  }

  async acquire(): Promise<T> {
    return this.instance.acquire();
  }

  async release(connectionInstance: T): Promise<void> {
    return this.instance.release(connectionInstance);
  }

  getStats() {
    return this.instance.getStats();
  }

  async dispose(): Promise<void> {
    return this.instance.dispose();
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
): ConnectionPoolInstance<any> {
  return createConnectionPool(createDbConnection, destroyDbConnection, healthCheckFn, config);
}
