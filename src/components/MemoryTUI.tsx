import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { LibSQLMemoryStorage, type MemoryEntry } from '../utils/libsql-storage.js';

type ViewMode = 'list' | 'help';

export const MemoryTUI: React.FC = () => {
  const { exit } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const memory = new LibSQLMemoryStorage();

  const loadEntries = async () => {
    console.log('MemoryTUI: loadEntries called');
    try {
      setLoading(true);

      // Test with hardcoded data first
      const testData: MemoryEntry[] = [
        {
          key: 'test1',
          namespace: 'default',
          value: 'Hello World',
          timestamp: Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          key: 'project',
          namespace: 'projects',
          value: { name: 'Test Project' },
          timestamp: Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      console.log('MemoryTUI: using test data:', testData.length);
      setEntries(testData);
      setMessage(`Loaded ${testData.length} test entries`);

      // Try actual database after
      // const allEntries = await memory.getAll();
      // console.log('MemoryTUI: got entries:', allEntries.length);
      // setEntries(allEntries);
      // setMessage(`Loaded ${allEntries.length} entries`);
    } catch (error) {
      console.error('MemoryTUI: error:', error);
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      exit();
    }

    if (input === 'r') {
      loadEntries();
    }

    if (input === 'h') {
      setViewMode(viewMode === 'help' ? 'list' : 'help');
    }
  });

  const renderList = () => (
    <Box flexDirection="column">
      <Box borderStyle="double" borderColor="blue" padding={1}>
        <Text bold color="blue">
          🧠 Sylphx Flow Memory Manager
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          Total Entries: {entries.length} | Press 'r' to refresh, 'h' for help, 'q' to quit
        </Text>
      </Box>

      {message && (
        <Box marginTop={1}>
          <Text color="yellow">{message}</Text>
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        {loading ? (
          <Text>Loading...</Text>
        ) : entries.length === 0 ? (
          <Text color="gray">No memory entries found</Text>
        ) : (
          entries.map((entry, index) => (
            <Box key={`${entry.namespace}-${entry.key}-${index}-${entry.timestamp}`}>
              <Text color="cyan">
                {index + 1}. {entry.namespace}:{entry.key}
              </Text>
              <Text dimColor>
                {' '}
                = {JSON.stringify(entry.value).substring(0, 60)}
                {JSON.stringify(entry.value).length > 60 ? '...' : ''}
              </Text>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );

  const renderHelp = () => (
    <Box flexDirection="column">
      <Box borderStyle="double" borderColor="green" padding={1}>
        <Text bold color="green">
          📖 Help - Memory Manager
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text>
          <Text color="cyan">r</Text> - Refresh entries
        </Text>
        <Text>
          <Text color="cyan">h</Text> - Toggle this help screen
        </Text>
        <Text>
          <Text color="cyan">q</Text> or <Text color="cyan">ESC</Text> - Quit
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press 'h' to go back to list</Text>
      </Box>
    </Box>
  );

  return viewMode === 'help' ? renderHelp() : renderList();
};
