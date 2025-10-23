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

  // ===== Codebase Index Caching =====

  async initializeCodebaseTables(): Promise<void> {
    // Create codebase files table
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS codebase_files (
        path TEXT PRIMARY KEY,
        mtime INTEGER NOT NULL,
        hash TEXT NOT NULL,
        content TEXT,
        language TEXT,
        size INTEGER,
        indexed_at TEXT NOT NULL
      )
    `);

    // Create TF-IDF terms table
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS tfidf_terms (
        file_path TEXT NOT NULL,
        term TEXT NOT NULL,
        frequency REAL NOT NULL,
        FOREIGN KEY (file_path) REFERENCES codebase_files(path) ON DELETE CASCADE
      )
    `);

    // Create TF-IDF documents table
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS tfidf_documents (
        file_path TEXT PRIMARY KEY,
        magnitude REAL NOT NULL,
        term_count INTEGER NOT NULL,
        raw_terms TEXT, -- JSON string
        FOREIGN KEY (file_path) REFERENCES codebase_files(path) ON DELETE CASCADE
      )
    `);

    // Create IDF table
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS tfidf_idf (
        term TEXT PRIMARY KEY,
        idf_value REAL NOT NULL
      )
    `);

    // Create codebase metadata table
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS codebase_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Create indexes for performance
    await this.client.execute(
      `CREATE INDEX IF NOT EXISTS idx_tfidf_terms_term ON tfidf_terms(term)`
    );
    await this.client.execute(
      `CREATE INDEX IF NOT EXISTS idx_tfidf_terms_file ON tfidf_terms(file_path)`
    );
    await this.client.execute(
      `CREATE INDEX IF NOT EXISTS idx_codebase_files_mtime ON codebase_files(mtime)`
    );
    await this.client.execute(
      `CREATE INDEX IF NOT EXISTS idx_codebase_files_hash ON codebase_files(hash)`
    );
  }

  // Store codebase metadata
  async setCodebaseMetadata(key: string, value: any): Promise<void> {
    const serializedValue = JSON.stringify(value);
    await this.client.execute({
      sql: `INSERT OR REPLACE INTO codebase_metadata (key, value) VALUES (?, ?)`,
      args: [key, serializedValue],
    });
  }

  // Get codebase metadata
  async getCodebaseMetadata(key: string): Promise<any> {
    const result = await this.client.execute({
      sql: `SELECT value FROM codebase_metadata WHERE key = ?`,
      args: [key],
    });

    if (result.rows.length === 0) {
      return null;
    }

    return JSON.parse(result.rows[0].value as string);
  }

  // Store file information
  async upsertCodebaseFile(file: {
    path: string;
    mtime: number;
    hash: string;
    content?: string;
    language?: string;
    size?: number;
  }): Promise<void> {
    const indexedAt = new Date().toISOString();

    await this.client.execute({
      sql: `
        INSERT OR REPLACE INTO codebase_files 
        (path, mtime, hash, content, language, size, indexed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        file.path,
        file.mtime,
        file.hash,
        file.content || null,
        file.language || null,
        file.size || null,
        indexedAt,
      ],
    });
  }

  // Get file information
  async getCodebaseFile(path: string): Promise<any> {
    const result = await this.client.execute({
      sql: `SELECT * FROM codebase_files WHERE path = ?`,
      args: [path],
    });

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Get all files
  async getAllCodebaseFiles(): Promise<any[]> {
    const result = await this.client.execute(`
      SELECT path, mtime, hash, language, size, indexed_at 
      FROM codebase_files 
      ORDER BY path
    `);

    return result.rows;
  }

  // Delete file
  async deleteCodebaseFile(path: string): Promise<void> {
    await this.client.execute({
      sql: `DELETE FROM codebase_files WHERE path = ?`,
      args: [path],
    });
  }

  // Store TF-IDF document
  async upsertTFIDFDocument(
    filePath: string,
    document: {
      magnitude: number;
      termCount: number;
      rawTerms: Record<string, number>;
    }
  ): Promise<void> {
    await this.client.execute({
      sql: `
        INSERT OR REPLACE INTO tfidf_documents 
        (file_path, magnitude, term_count, raw_terms)
        VALUES (?, ?, ?, ?)
      `,
      args: [filePath, document.magnitude, document.termCount, JSON.stringify(document.rawTerms)],
    });
  }

  // Get TF-IDF document
  async getTFIDFDocument(filePath: string): Promise<any> {
    const result = await this.client.execute({
      sql: `SELECT * FROM tfidf_documents WHERE file_path = ?`,
      args: [filePath],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      file_path: row.file_path,
      magnitude: row.magnitude,
      term_count: row.term_count,
      rawTerms: JSON.parse(row.raw_terms as string),
    };
  }

  // Store TF-IDF terms for a file
  async setTFIDFTerms(filePath: string, terms: Record<string, number>): Promise<void> {
    // Delete existing terms for this file
    await this.client.execute({
      sql: `DELETE FROM tfidf_terms WHERE file_path = ?`,
      args: [filePath],
    });

    // Insert new terms
    for (const [term, frequency] of Object.entries(terms)) {
      await this.client.execute({
        sql: `INSERT INTO tfidf_terms (file_path, term, frequency) VALUES (?, ?, ?)`,
        args: [filePath, term, frequency],
      });
    }
  }

  // Get TF-IDF terms for a file
  async getTFIDFTerms(filePath: string): Promise<Record<string, number>> {
    const result = await this.client.execute({
      sql: `SELECT term, frequency FROM tfidf_terms WHERE file_path = ?`,
      args: [filePath],
    });

    const terms: Record<string, number> = {};
    for (const row of result.rows) {
      terms[row.term as string] = row.frequency as number;
    }

    return terms;
  }

  // Store IDF values
  async setIDFValues(idfValues: Record<string, number>): Promise<void> {
    // Clear existing IDF values
    await this.client.execute(`DELETE FROM tfidf_idf`);

    // Insert new values
    for (const [term, idfValue] of Object.entries(idfValues)) {
      await this.client.execute({
        sql: `INSERT INTO tfidf_idf (term, idf_value) VALUES (?, ?)`,
        args: [term, idfValue],
      });
    }
  }

  // Get IDF values
  async getIDFValues(): Promise<Record<string, number>> {
    const result = await this.client.execute(`SELECT term, idf_value FROM tfidf_idf`);

    const idfValues: Record<string, number> = {};
    for (const row of result.rows) {
      idfValues[row.term as string] = row.idf_value as number;
    }

    return idfValues;
  }

  // Get codebase index stats
  async getCodebaseIndexStats(): Promise<{
    fileCount: number;
    termCount: number;
    indexedAt?: string;
    version?: string;
  }> {
    // Get file count
    const fileCountResult = await this.client.execute(`
      SELECT COUNT(*) as count FROM codebase_files
    `);
    const fileCount = (fileCountResult.rows[0] as any).count as number;

    // Get term count
    const termCountResult = await this.client.execute(`
      SELECT COUNT(DISTINCT term) as count FROM tfidf_terms
    `);
    const termCount = (termCountResult.rows[0] as any).count as number;

    // Get metadata
    const indexedAt = await this.getCodebaseMetadata('indexedAt');
    const version = await this.getCodebaseMetadata('version');

    return {
      fileCount,
      termCount,
      indexedAt,
      version,
    };
  }

  // Clear codebase index
  async clearCodebaseIndex(): Promise<void> {
    await this.client.execute(`DELETE FROM codebase_files`);
    await this.client.execute(`DELETE FROM tfidf_terms`);
    await this.client.execute(`DELETE FROM tfidf_documents`);
    await this.client.execute(`DELETE FROM tfidf_idf`);
    await this.client.execute(`DELETE FROM codebase_metadata`);
  }

  // Search TF-IDF terms (for debugging/analysis)
  async searchTFIDFTerms(termPattern: string): Promise<any[]> {
    const result = await this.client.execute({
      sql: `
        SELECT cf.path, tt.term, tt.frequency, cf.language
        FROM tfidf_terms tt
        JOIN codebase_files cf ON tt.file_path = cf.path
        WHERE tt.term LIKE ?
        ORDER BY tt.frequency DESC
        LIMIT 100
      `,
      args: [`%${termPattern}%`],
    });

    return result.rows;
  }
}
