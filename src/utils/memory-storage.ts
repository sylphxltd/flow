import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Memory data interface
export interface MemoryEntry {
  key: string;
  namespace: string;
  value: any;
  timestamp: number;
  created_at: string;
  updated_at: string;
}

// Memory data structure
export interface MemoryData {
  namespaces: Record<string, Record<string, any>>;
}

// Simple memory storage class for CLI operations
export class MemoryStorage {
  private filePath: string;

  constructor() {
    this.filePath = path.join(process.cwd(), '.sylphx-flow', 'memory.db');
  }

  private async loadData(): Promise<Map<string, MemoryEntry>> {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(data);

      // Check if it's already in flat format or namespace format
      if (parsed.namespaces) {
        // Convert namespace format to flat format
        const flatMap = new Map<string, MemoryEntry>();
        const now = Date.now();
        const isoString = new Date(now).toISOString();

        Object.entries(parsed.namespaces).forEach(([namespace, nsData]) => {
          Object.entries(nsData as Record<string, any>).forEach(([key, value]) => {
            const entry: MemoryEntry = {
              key,
              namespace,
              value,
              timestamp: now,
              created_at: isoString,
              updated_at: isoString,
            };
            flatMap.set(`${namespace}:${key}`, entry);
          });
        });

        return flatMap;
      } else {
        // Already in flat format
        return new Map(Object.entries(parsed));
      }
    } catch {
      return new Map();
    }
  }

  private async saveData(data: Map<string, MemoryEntry>): Promise<void> {
    try {
      const obj = Object.fromEntries(data);
      await fs.writeFile(this.filePath, JSON.stringify(obj, null, 2), 'utf8');
    } catch (error) {
      console.warn('Warning: Could not save memory data:', error);
    }
  }

  async getAll(): Promise<MemoryEntry[]> {
    const data = await this.loadData();
    return Array.from(data.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  async search(pattern: string, namespace?: string): Promise<MemoryEntry[]> {
    const data = await this.loadData();
    const results: MemoryEntry[] = [];

    const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');

    for (const entry of data.values()) {
      if (namespace && entry.namespace !== namespace) continue;

      if (regex.test(entry.key) || regex.test(JSON.stringify(entry.value))) {
        results.push(entry);
      }
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  async set(key: string, value: any, namespace = 'default'): Promise<void> {
    const data = await this.loadData();
    const now = Date.now();
    const isoString = new Date(now).toISOString();

    const entry: MemoryEntry = {
      key,
      namespace,
      value,
      timestamp: now,
      created_at: isoString,
      updated_at: isoString,
    };

    data.set(`${namespace}:${key}`, entry);
    await this.saveData(data);
  }

  async get(key: string, namespace = 'default'): Promise<any | null> {
    const data = await this.loadData();
    const entry = data.get(`${namespace}:${key}`);
    return entry?.value || null;
  }

  async delete(key: string, namespace = 'default'): Promise<boolean> {
    const data = await this.loadData();
    const deleted = data.delete(`${namespace}:${key}`);
    if (deleted) {
      await this.saveData(data);
    }
    return deleted;
  }

  async clear(namespace?: string): Promise<void> {
    const data = await this.loadData();

    if (namespace) {
      // Clear specific namespace
      const keysToDelete: string[] = [];
      for (const [fullKey, entry] of data.entries()) {
        if (entry.namespace === namespace) {
          keysToDelete.push(fullKey);
        }
      }
      keysToDelete.forEach((key) => data.delete(key));
    } else {
      // Clear all
      data.clear();
    }

    await this.saveData(data);
  }

  async getStats(): Promise<{
    totalEntries: number;
    namespaces: string[];
    namespaceCounts: Record<string, number>;
    oldestEntry: string | null;
    newestEntry: string | null;
  }> {
    const data = await this.loadData();
    const entries = Array.from(data.values());

    const namespaces = Array.from(new Set(entries.map((e) => e.namespace)));
    const namespaceCounts: Record<string, number> = {};

    entries.forEach((entry) => {
      namespaceCounts[entry.namespace] = (namespaceCounts[entry.namespace] || 0) + 1;
    });

    const sortedEntries = entries.sort((a, b) => a.timestamp - b.timestamp);
    const oldestEntry = sortedEntries.length > 0 ? sortedEntries[0].created_at : null;
    const newestEntry =
      sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1].created_at : null;

    return {
      totalEntries: entries.length,
      namespaces,
      namespaceCounts,
      oldestEntry,
      newestEntry,
    };
  }

  // Load the full memory data structure (for compatibility with MCP server)
  async load(): Promise<MemoryData> {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(data);

      // Convert flat structure to namespace structure
      const namespaces: Record<string, Record<string, any>> = {};

      if (parsed.namespaces) {
        // Already in namespace format
        return parsed;
      } else {
        // Convert from flat format
        Object.entries(parsed).forEach(([fullKey, entry]: [string, any]) => {
          const [namespace, key] = fullKey.split(':', 2);
          if (!namespaces[namespace]) {
            namespaces[namespace] = {};
          }
          namespaces[namespace][key] = entry.value;
        });

        return { namespaces };
      }
    } catch {
      return { namespaces: {} };
    }
  }
}
