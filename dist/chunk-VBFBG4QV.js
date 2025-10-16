// src/utils/libsql-storage.ts
import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";
var LibSQLMemoryStorage = class {
  client;
  dbPath;
  constructor() {
    const memoryDir = path.join(process.cwd(), ".sylphx-flow");
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }
    this.dbPath = path.join(memoryDir, "memory.db");
    this.client = createClient({
      url: `file:${this.dbPath}`
    });
    this.initializeTables();
  }
  async initializeTables() {
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
  serializeValue(value) {
    return JSON.stringify(value);
  }
  deserializeValue(value) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  async set(key, value, namespace = "default") {
    const now = /* @__PURE__ */ new Date();
    const timestamp = now.getTime();
    const created_at = now.toISOString();
    const updated_at = created_at;
    const serializedValue = this.serializeValue(value);
    const existing = await this.get(key, namespace);
    if (existing) {
      const updateSQL = `
        UPDATE memory 
        SET value = ?, timestamp = ?, updated_at = ?
        WHERE key = ? AND namespace = ?
      `;
      await this.client.execute({
        sql: updateSQL,
        args: [serializedValue, timestamp, updated_at, key, namespace]
      });
    } else {
      const insertSQL = `
        INSERT INTO memory (key, namespace, value, timestamp, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      await this.client.execute({
        sql: insertSQL,
        args: [key, namespace, serializedValue, timestamp, created_at, updated_at]
      });
    }
  }
  async get(key, namespace = "default") {
    const selectSQL = `
      SELECT key, namespace, value, timestamp, created_at, updated_at
      FROM memory
      WHERE key = ? AND namespace = ?
    `;
    const result = await this.client.execute({
      sql: selectSQL,
      args: [key, namespace]
    });
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
    return {
      key: row.key,
      namespace: row.namespace,
      value: this.deserializeValue(row.value),
      timestamp: row.timestamp,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
  async getAll() {
    const selectSQL = `
      SELECT key, namespace, value, timestamp, created_at, updated_at
      FROM memory
      ORDER BY timestamp DESC
    `;
    const result = await this.client.execute(selectSQL);
    return result.rows.map((row) => ({
      key: row.key,
      namespace: row.namespace,
      value: this.deserializeValue(row.value),
      timestamp: row.timestamp,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  }
  async search(pattern, namespace) {
    const searchPattern = pattern.replace(/\*/g, "%");
    let selectSQL = `
      SELECT key, namespace, value, timestamp, created_at, updated_at
      FROM memory
      WHERE key LIKE ? OR value LIKE ?
    `;
    const args = [searchPattern, searchPattern];
    if (namespace && namespace !== "all") {
      selectSQL += " AND namespace = ?";
      args.push(namespace);
    }
    selectSQL += " ORDER BY timestamp DESC";
    const result = await this.client.execute({
      sql: selectSQL,
      args
    });
    return result.rows.map((row) => ({
      key: row.key,
      namespace: row.namespace,
      value: this.deserializeValue(row.value),
      timestamp: row.timestamp,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  }
  async delete(key, namespace = "default") {
    const deleteSQL = `
      DELETE FROM memory
      WHERE key = ? AND namespace = ?
    `;
    const result = await this.client.execute({
      sql: deleteSQL,
      args: [key, namespace]
    });
    return result.rowsAffected > 0;
  }
  async clear(namespace) {
    if (namespace && namespace !== "all") {
      const deleteSQL = "DELETE FROM memory WHERE namespace = ?";
      await this.client.execute({
        sql: deleteSQL,
        args: [namespace]
      });
    } else {
      const deleteSQL = "DELETE FROM memory";
      await this.client.execute(deleteSQL);
    }
  }
  async getStats() {
    const countResult = await this.client.execute("SELECT COUNT(*) as count FROM memory");
    const totalEntries = countResult.rows[0].count;
    const namespaceResult = await this.client.execute(`
      SELECT namespace, COUNT(*) as count
      FROM memory
      GROUP BY namespace
      ORDER BY namespace
    `);
    const namespaces = namespaceResult.rows.map((row) => row.namespace);
    const namespaceCounts = {};
    namespaceResult.rows.forEach((row) => {
      namespaceCounts[row.namespace] = row.count;
    });
    const timeResult = await this.client.execute(`
      SELECT 
        MIN(created_at) as oldest,
        MAX(created_at) as newest
      FROM memory
    `);
    const timeRow = timeResult.rows[0];
    const oldestEntry = timeRow.oldest;
    const newestEntry = timeRow.newest;
    return {
      totalEntries,
      namespaces,
      namespaceCounts,
      oldestEntry,
      newestEntry
    };
  }
  // Load method for compatibility with existing code
  async load() {
    const entries = await this.getAll();
    const namespaces = {};
    entries.forEach((entry) => {
      if (!namespaces[entry.namespace]) {
        namespaces[entry.namespace] = {};
      }
      namespaces[entry.namespace][entry.key] = entry.value;
    });
    return { namespaces };
  }
  // Close database connection
  async close() {
  }
  // Get database path for debugging
  getDatabasePath() {
    return this.dbPath;
  }
};

export {
  LibSQLMemoryStorage
};
