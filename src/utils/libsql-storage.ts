import * as fs from 'node:fs';
import * as path from 'node:path';
import { createClient } from '@libsql/client';

// Memory entry interface
export interface MemoryEntry {
  key: string;
  namespace: string;
  value: any;
  timestamp: number;
  created_at: string;
  updated_at: string;
}

// libSQL-based memory storage
export class LibSQLMemoryStorage {
  private client: any;
  private dbPath: string;

  constructor() {
    const memoryDir = path.join(process.cwd(), '.sylphx-flow');

    // Ensure directory exists
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }

    this.dbPath = path.join(memoryDir, 'memory.db');
    this.client = createClient({
      url: `file:${this.dbPath}`,
    });

    // Initialize tables
    this.initializeTables();
  }

  private async initializeTables(): Promise<void> {
    // Create memory table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS memory (
        key TEXT NOT NULL,
        namespace TEXT NOT NULL DEFAULT 'default',
        value TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (key, namespace)
      )
    `;

    await this.client.execute(createTableSQL);

    // Create indexes for performance
    await this.client.execute(`
      CREATE INDEX IF NOT EXISTS idx_memory_namespace ON memory(namespace);
    `);

    await this.client.execute(`
      CREATE INDEX IF NOT EXISTS idx_memory_timestamp ON memory(timestamp);
    `);

    await this.client.execute(`
      CREATE INDEX IF NOT EXISTS idx_memory_key ON memory(key);
    `);
  }

  private serializeValue(value: any): string {
    return JSON.stringify(value);
  }

  private deserializeValue(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async set(key: string, value: any, namespace = 'default'): Promise<void> {
    const now = new Date();
    const timestamp = now.getTime();
    const created_at = now.toISOString();
    const updated_at = created_at;
    const serializedValue = this.serializeValue(value);

    // Check if entry exists
    const existing = await this.get(key, namespace);

    if (existing) {
      // Update existing entry
      const updateSQL = `
        UPDATE memory 
        SET value = ?, timestamp = ?, updated_at = ?
        WHERE key = ? AND namespace = ?
      `;

      await this.client.execute({
        sql: updateSQL,
        args: [serializedValue, timestamp, updated_at, key, namespace],
      });
    } else {
      // Insert new entry
      const insertSQL = `
        INSERT INTO memory (key, namespace, value, timestamp, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      await this.client.execute({
        sql: insertSQL,
        args: [key, namespace, serializedValue, timestamp, created_at, updated_at],
      });
    }
  }

  async get(key: string, namespace = 'default'): Promise<MemoryEntry | null> {
    const selectSQL = `
      SELECT key, namespace, value, timestamp, created_at, updated_at
      FROM memory
      WHERE key = ? AND namespace = ?
    `;

    const result = await this.client.execute({
      sql: selectSQL,
      args: [key, namespace],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      key: row.key as string,
      namespace: row.namespace as string,
      value: this.deserializeValue(row.value as string),
      timestamp: row.timestamp as number,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }

  async getAll(): Promise<MemoryEntry[]> {
    const selectSQL = `
      SELECT key, namespace, value, timestamp, created_at, updated_at
      FROM memory
      ORDER BY timestamp DESC
    `;

    const result = await this.client.execute(selectSQL);

    return result.rows.map((row: any) => ({
      key: row.key as string,
      namespace: row.namespace as string,
      value: this.deserializeValue(row.value as string),
      timestamp: row.timestamp as number,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    }));
  }

  async search(pattern: string, namespace?: string): Promise<MemoryEntry[]> {
    const searchPattern = pattern.replace(/\*/g, '%');
    let selectSQL = `
      SELECT key, namespace, value, timestamp, created_at, updated_at
      FROM memory
      WHERE key LIKE ? OR value LIKE ?
    `;

    const args: any[] = [searchPattern, searchPattern];

    if (namespace && namespace !== 'all') {
      selectSQL += ' AND namespace = ?';
      args.push(namespace);
    }

    selectSQL += ' ORDER BY timestamp DESC';

    const result = await this.client.execute({
      sql: selectSQL,
      args,
    });

    return result.rows.map((row: any) => ({
      key: row.key as string,
      namespace: row.namespace as string,
      value: this.deserializeValue(row.value as string),
      timestamp: row.timestamp as number,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    }));
  }

  async delete(key: string, namespace = 'default'): Promise<boolean> {
    const deleteSQL = `
      DELETE FROM memory
      WHERE key = ? AND namespace = ?
    `;

    const result = await this.client.execute({
      sql: deleteSQL,
      args: [key, namespace],
    });

    return result.rowsAffected > 0;
  }

  async clear(namespace?: string): Promise<void> {
    if (namespace && namespace !== 'all') {
      const deleteSQL = 'DELETE FROM memory WHERE namespace = ?';
      await this.client.execute({
        sql: deleteSQL,
        args: [namespace],
      });
    } else {
      const deleteSQL = 'DELETE FROM memory';
      await this.client.execute(deleteSQL);
    }
  }

  async getStats(): Promise<{
    totalEntries: number;
    namespaces: string[];
    namespaceCounts: Record<string, number>;
    oldestEntry: string | null;
    newestEntry: string | null;
  }> {
    // Get total count
    const countResult = await this.client.execute('SELECT COUNT(*) as count FROM memory');
    const totalEntries = (countResult.rows[0] as any).count as number;

    // Get namespace stats
    const namespaceResult = await this.client.execute(`
      SELECT namespace, COUNT(*) as count
      FROM memory
      GROUP BY namespace
      ORDER BY namespace
    `);

    const namespaces = namespaceResult.rows.map((row: any) => row.namespace as string);
    const namespaceCounts: Record<string, number> = {};
    namespaceResult.rows.forEach((row: any) => {
      namespaceCounts[row.namespace as string] = row.count as number;
    });

    // Get oldest and newest entries
    const timeResult = await this.client.execute(`
      SELECT 
        MIN(created_at) as oldest,
        MAX(created_at) as newest
      FROM memory
    `);

    const timeRow = timeResult.rows[0] as any;
    const oldestEntry = timeRow.oldest as string | null;
    const newestEntry = timeRow.newest as string | null;

    return {
      totalEntries,
      namespaces,
      namespaceCounts,
      oldestEntry,
      newestEntry,
    };
  }

  // Load method for compatibility with existing code
  async load(): Promise<{ namespaces: Record<string, Record<string, any>> }> {
    const entries = await this.getAll();
    const namespaces: Record<string, Record<string, any>> = {};

    entries.forEach((entry) => {
      if (!namespaces[entry.namespace]) {
        namespaces[entry.namespace] = {};
      }
      namespaces[entry.namespace][entry.key] = entry.value;
    });

    return { namespaces };
  }

  // Close database connection
  async close(): Promise<void> {
    // libSQL client doesn't have an explicit close method for file-based databases
    // The connection is automatically cleaned up
  }

  // Get database path for debugging
  getDatabasePath(): string {
    return this.dbPath;
  }
}
