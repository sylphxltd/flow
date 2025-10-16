import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Text,
  useInput,
  useApp,
  Newline,
  Spacer,
} from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import Table from 'ink-table';
import { MemoryStorage, type MemoryEntry } from '../utils/memory-storage.js';

type ViewMode = 'list' | 'search' | 'details' | 'edit' | 'delete' | 'stats';

export const MemoryTUI: React.FC = () => {
  const { exit } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<MemoryEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [namespace, setNamespace] = useState('all');
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editNamespace, setEditNamespace] = useState('default');
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState<any>(null);

  const memory = new MemoryStorage();

  const loadEntries = useCallback(async () => {
    try {
      const data = await memory.load();
      const flatEntries: MemoryEntry[] = [];
      
      Object.entries(data.namespaces || {}).forEach(([ns, nsData]) => {
        Object.entries(nsData as any).forEach(([key, value]) => {
          flatEntries.push({
            key,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            namespace: ns,
            timestamp: new Date().toISOString(), // Would be stored in real implementation
          });
        });
      });

      setEntries(flatEntries);
    } catch (error) {
      setMessage(`❌ Error loading entries: ${error}`);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await memory.load();
      const namespaces = Object.keys(data.namespaces || {});
      const totalEntries = entries.length;
      
      setStats({
        totalEntries,
        namespaces: namespaces.length,
        namespaceBreakdown: namespaces.map(ns => ({
          namespace: ns,
          count: Object.keys((data.namespaces as any)?.[ns] || {}).length,
        })),
        oldestEntry: entries.length > 0 ? '2025-10-01' : 'N/A',
        newestEntry: entries.length > 0 ? '2025-10-16' : 'N/A',
      });
    } catch (error) {
      setMessage(`❌ Error loading stats: ${error}`);
    }
  }, [entries]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (viewMode === 'stats') {
      loadStats();
    }
  }, [viewMode, loadStats]);

  useInput((input, key) => {
    if (key.escape) {
      exit();
    }

    if (viewMode === 'list') {
      if (input === 'q') exit();
      if (input === 's') setViewMode('search');
      if (input === 'n') setViewMode('edit');
      if (input === 'd') setViewMode('delete');
      if (input === 't') setViewMode('stats');
      if (input === 'r') loadEntries();
    }

    if (viewMode === 'search' && key.escape) {
      setViewMode('list');
      setSearchQuery('');
    }

    if (viewMode === 'details' && key.escape) {
      setViewMode('list');
      setSelectedEntry(null);
    }

    if (viewMode === 'edit' && key.escape) {
      setViewMode('list');
      setEditKey('');
      setEditValue('');
      setEditNamespace('default');
    }

    if (viewMode === 'delete' && key.escape) {
      setViewMode('list');
      setSelectedEntry(null);
    }

    if (viewMode === 'stats' && key.escape) {
      setViewMode('list');
    }
  });

  const handleEntrySelect = (entry: any) => {
    setSelectedEntry(entry);
    setViewMode('details');
  };

  const handleSearch = async () => {
    try {
      const results = await memory.search(searchQuery);
      const searchResults: MemoryEntry[] = results.flat().map(([key, value, ns]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
        namespace: ns || 'default',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      setEntries(searchResults);
      setMessage(`🔍 Found ${searchResults.length} results for "${searchQuery}"`);
    } catch (error) {
      setMessage(`❌ Search error: ${error}`);
    }
  };

  const handleSave = async () => {
    try {
      await memory.set(editKey, editValue, editNamespace);
      setMessage(`✅ Saved "${editKey}" to "${editNamespace}"`);
      setEditKey('');
      setEditValue('');
      setEditNamespace('default');
      setViewMode('list');
      await loadEntries();
    } catch (error) {
      setMessage(`❌ Save error: ${error}`);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    
    try {
      await memory.delete(selectedEntry.key, selectedEntry.namespace);
      setMessage(`🗑️ Deleted "${selectedEntry.key}" from "${selectedEntry.namespace}"`);
      setSelectedEntry(null);
      setViewMode('list');
      await loadEntries();
    } catch (error) {
      setMessage(`❌ Delete error: ${error}`);
    }
  };

  const filteredEntries = namespace === 'all' 
    ? entries 
    : entries.filter(e => e.namespace === namespace);

  const renderList = () => (
    <Box flexDirection="column">
      <Box borderStyle="double" borderColor="green" padding={1} marginBottom={1}>
        <Text bold color="green">🧠 Sylphx Flow Memory Manager</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="cyan">Entries: {filteredEntries.length} | Namespace: {namespace}</Text>
        <Spacer />
        <Text dimColor>Press 'q' to quit, 's' search, 'n' new, 't' stats</Text>
      </Box>

      {message && (
        <Box marginBottom={1}>
          <Text color="yellow">{message}</Text>
        </Box>
      )}

      <Box marginBottom={1}>
        <Text color="gray">Filter by namespace:</Text>
        <SelectInput
          items={['all', ...Array.from(new Set(entries.map(e => e.namespace)))].map(ns => ({
            label: ns,
            value: ns,
          }))}
          onSelect={(item: any) => setNamespace(item.value as string)}
        />
      </Box>

      <Box flexDirection="column" borderStyle="single" padding={1}>
        <Text bold color="blue">Memory Entries:</Text>
        <Newline />
        {filteredEntries.length === 0 ? (
          <Text color="gray">No entries found</Text>
        ) : (
          <SelectInput
            items={filteredEntries.map(entry => ({
              label: `${entry.namespace}:${entry.key} - ${entry.value.substring(0, 50)}...`,
              value: entry,
            }))}
            onSelect={handleEntrySelect}
          />
        )}
      </Box>
    </Box>
  );

  const renderSearch = () => (
    <Box flexDirection="column">
      <Box borderStyle="double" borderColor="blue" padding={1} marginBottom={1}>
        <Text bold color="blue">🔍 Search Memory</Text>
      </Box>

      <Box marginBottom={1}>
        <Text>Search pattern (supports * wildcards):</Text>
        <TextInput
          value={searchQuery}
          onChange={setSearchQuery}
          onSubmit={handleSearch}
          placeholder="*theme*"
        />
      </Box>

      <Box>
        <Text dimColor>Press ESC to go back, ENTER to search</Text>
      </Box>
    </Box>
  );

  const renderDetails = () => {
    if (!selectedEntry) return null;

    return (
      <Box flexDirection="column">
        <Box borderStyle="double" borderColor="yellow" padding={1} marginBottom={1}>
          <Text bold color="yellow">📄 Entry Details</Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text><Text color="cyan">Namespace:</Text> {selectedEntry.namespace}</Text>
          <Text><Text color="cyan">Key:</Text> {selectedEntry.key}</Text>
          <Text><Text color="cyan">Value:</Text></Text>
          <Box borderStyle="single" padding={1}>
            <Text>{selectedEntry.value}</Text>
          </Box>
          <Text><Text color="cyan">Timestamp:</Text> {selectedEntry.timestamp}</Text>
        </Box>

        <Box>
          <Text dimColor>Press ESC to go back, 'd' to delete, 'e' to edit</Text>
        </Box>

        {message && (
          <Box marginTop={1}>
            <Text color="yellow">{message}</Text>
          </Box>
        )}
      </Box>
    );
  };

  const renderEdit = () => (
    <Box flexDirection="column">
      <Box borderStyle="double" borderColor="magenta" padding={1} marginBottom={1}>
        <Text bold color="magenta">✏️ {selectedEntry ? 'Edit' : 'New'} Entry</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text><Text color="cyan">Namespace:</Text></Text>
        <TextInput
          value={editNamespace}
          onChange={setEditNamespace}
          placeholder="default"
        />

        <Text><Text color="cyan">Key:</Text></Text>
        <TextInput
          value={editKey}
          onChange={setEditKey}
          placeholder="project:framework"
        />

        <Text><Text color="cyan">Value:</Text></Text>
        <TextInput
          value={editValue}
          onChange={setEditValue}
          placeholder="React + TypeScript"
          onSubmit={handleSave}
        />
      </Box>

      <Box>
        <Text dimColor>Press ESC to cancel, ENTER to save</Text>
      </Box>

      {message && (
        <Box marginTop={1}>
          <Text color="yellow">{message}</Text>
        </Box>
      )}
    </Box>
  );

  const renderDelete = () => {
    if (!selectedEntry) return null;

    return (
      <Box flexDirection="column">
        <Box borderStyle="double" borderColor="red" padding={1} marginBottom={1}>
          <Text bold color="red">🗑️ Confirm Delete</Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text>Are you sure you want to delete:</Text>
          <Text><Text color="cyan">Namespace:</Text> {selectedEntry.namespace}</Text>
          <Text><Text color="cyan">Key:</Text> {selectedEntry.key}</Text>
          <Text><Text color="cyan">Value:</Text> {selectedEntry.value.substring(0, 100)}...</Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="red">Press 'y' to confirm, any other key to cancel</Text>
        </Box>

        {message && (
          <Box>
            <Text color="yellow">{message}</Text>
          </Box>
        )}
      </Box>
    );
  };

  const renderStats = () => {
    if (!stats) return null;

    return (
      <Box flexDirection="column">
        <Box borderStyle="double" borderColor="cyan" padding={1} marginBottom={1}>
          <Text bold color="cyan">📊 Memory Statistics</Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text><Text color="cyan">Total Entries:</Text> {stats.totalEntries}</Text>
          <Text><Text color="cyan">Namespaces:</Text> {stats.namespaces}</Text>
          <Text><Text color="cyan">Oldest Entry:</Text> {stats.oldestEntry}</Text>
          <Text><Text color="cyan">Newest Entry:</Text> {stats.newestEntry}</Text>
        </Box>

        <Box marginBottom={1}>
          <Text bold color="blue">Namespace Breakdown:</Text>
          <Table
            data={stats.namespaceBreakdown}
            columns={[
              { key: 'namespace', label: 'Namespace' },
              { key: 'count', label: 'Entries' },
            ]}
          />
        </Box>

        <Box>
          <Text dimColor>Press ESC to go back</Text>
        </Box>
      </Box>
    );
  };

  // Handle delete confirmation
  useInput((input, key) => {
    if (viewMode === 'delete' && input === 'y') {
      handleDelete();
    } else if (viewMode === 'delete' && key.return) {
      setViewMode('list');
      setSelectedEntry(null);
    }

    if (viewMode === 'details' && selectedEntry && input === 'd') {
      setViewMode('delete');
    }

    if (viewMode === 'details' && selectedEntry && input === 'e') {
      setEditKey(selectedEntry.key);
      setEditValue(selectedEntry.value);
      setEditNamespace(selectedEntry.namespace);
      setViewMode('edit');
    }
  });

  switch (viewMode) {
    case 'search':
      return renderSearch();
    case 'details':
      return renderDetails();
    case 'edit':
      return renderEdit();
    case 'delete':
      return renderDelete();
    case 'stats':
      return renderStats();
    default:
      return renderList();
  }
};