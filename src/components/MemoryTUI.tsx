import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { LibSQLMemoryStorage, type MemoryEntry } from '../utils/libsql-storage.js';

type ViewMode = 'list' | 'search' | 'add' | 'edit' | 'help' | 'confirm-delete';
type SortBy = 'key' | 'namespace' | 'timestamp' | 'updated_at';

interface TUIState {
  entries: MemoryEntry[];
  filteredEntries: MemoryEntry[];
  loading: boolean;
  message: string;
  viewMode: ViewMode;
  selectedIndex: number;
  searchQuery: string;
  sortBy: SortBy;
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
  selectedEntry: MemoryEntry | null;
  deleteConfirmEntry: MemoryEntry | null;
  newEntry: { namespace: string; key: string; value: string };
  editEntry: { namespace: string; key: string; value: string };
  renderKey?: number;
}

// External state to work around React+Ink compatibility issue
const externalState: TUIState = {
  entries: [],
  filteredEntries: [],
  loading: false,
  message: '',
  viewMode: 'list',
  selectedIndex: 0,
  searchQuery: '',
  sortBy: 'updated_at',
  sortOrder: 'desc',
  page: 0,
  pageSize: 10,
  selectedEntry: null,
  deleteConfirmEntry: null,
  newEntry: { namespace: 'default', key: '', value: '' },
  editEntry: { namespace: '', key: '', value: '' },
  renderKey: 0,
};

export const MemoryTUI: React.FC = () => {
  const { exit } = useApp();
  const [, forceUpdate] = useState({});
  const memory = new LibSQLMemoryStorage();

  // Force re-render function
  const forceRender = useCallback(() => {
    externalState.renderKey = (externalState.renderKey || 0) + 1;
    forceUpdate({});
  }, []);

  // Get current state from external state
  const getState = (): TUIState => {
    externalState.filteredEntries = filterEntries(externalState.entries);
    return externalState;
  };

  const filterEntries = (entries: MemoryEntry[]): MemoryEntry[] => {
    // Simple filtering - can be enhanced with search query
    return entries.sort((a, b) => {
      const aTime = new Date(a.updated_at).getTime();
      const bTime = new Date(b.updated_at).getTime();
      return bTime - aTime; // Most recent first
    });
  };

  const loadEntries = useCallback(async () => {
    console.log('MemoryTUI: Loading entries...');
    externalState.loading = true;
    externalState.message = 'Loading entries...';
    externalState.selectedIndex = 0;
    externalState.page = 0;
    forceRender();

    try {
      const allEntries = await memory.getAll();
      console.log(`MemoryTUI: Loaded ${allEntries.length} entries`);
      externalState.entries = allEntries;
      externalState.loading = false;
      externalState.message = `Loaded ${allEntries.length} entries`;
    } catch (error) {
      console.error('MemoryTUI: Error loading entries:', error);
      externalState.loading = false;
      externalState.message = `Error: ${error}`;
    }

    forceRender();
  }, [memory, forceRender]);

  const deleteEntry = useCallback(
    async (entry: MemoryEntry) => {
      try {
        await memory.delete(entry.key, entry.namespace);
        externalState.message = `Deleted entry: ${entry.namespace}:${entry.key}`;
        externalState.viewMode = 'list';
        externalState.deleteConfirmEntry = null;
        await loadEntries();
      } catch (error) {
        externalState.message = `Error deleting entry: ${error}`;
        forceRender();
      }
    },
    [memory, loadEntries, forceRender]
  );

  // Initial load
  useEffect(() => {
    loadEntries();
  }, []);

  useInput((input, key) => {
    const state = getState();

    // Global shortcuts
    if (key.escape || input === 'q') {
      if (state.viewMode !== 'list') {
        // Go back to list
        state.viewMode = 'list';
        forceRender();
      } else {
        exit();
      }
      return;
    }

    if (input === 'r') {
      loadEntries();
      return;
    }

    if (input === 'h') {
      state.viewMode = state.viewMode === 'help' ? 'list' : 'help';
      forceRender();
      return;
    }

    // List view navigation
    if (state.viewMode === 'list') {
      if (input === 'a') {
        state.viewMode = 'add';
        forceRender();
      } else if (input === 'n' && state.selectedIndex < state.filteredEntries.length - 1) {
        state.selectedIndex++;
        forceRender();
      } else if (input === 'p' && state.selectedIndex > 0) {
        state.selectedIndex--;
        forceRender();
      } else if (input === 'e' && state.filteredEntries[state.selectedIndex]) {
        const entry = state.filteredEntries[state.selectedIndex];
        state.editEntry = {
          namespace: entry.namespace,
          key: entry.key,
          value: JSON.stringify(entry.value, null, 2),
        };
        state.viewMode = 'edit';
        forceRender();
      } else if (input === 'd' && state.filteredEntries[state.selectedIndex]) {
        state.deleteConfirmEntry = state.filteredEntries[state.selectedIndex];
        state.viewMode = 'confirm-delete';
        forceRender();
      }
    }

    // Confirm delete
    if (state.viewMode === 'confirm-delete') {
      if (input === 'y' && state.deleteConfirmEntry) {
        deleteEntry(state.deleteConfirmEntry);
        state.viewMode = 'list';
        state.deleteConfirmEntry = null;
      } else if (input === 'n') {
        state.viewMode = 'list';
        state.deleteConfirmEntry = null;
        forceRender();
      }
    }
  });

  const state = getState();

  const renderHeader = () => (
    <Box borderStyle="double" borderColor="blue" padding={1}>
      <Text bold color="blue">
        🧠 Sylphx Flow Memory Manager
      </Text>
      <Text color="gray">
        {' '}
        | Entries: {state.entries.length} | Page: {state.page + 1}
      </Text>
    </Box>
  );

  const renderList = () => (
    <Box flexDirection="column" height="100%" width="100%">
      {renderHeader()}

      <Box marginTop={1}>
        <Text color="gray">[a]dd [e]dit [d]elete [r]efresh [h]elp [q]uit | [n]ext [p]rev</Text>
      </Box>

      {state.message && (
        <Box marginTop={1}>
          <Text color="yellow">{state.message}</Text>
        </Box>
      )}

      <Box marginTop={1} flexDirection="column" flexGrow={1}>
        {state.loading ? (
          <Box justifyContent="center" alignItems="center" flexGrow={1}>
            <Text>Loading...</Text>
          </Box>
        ) : state.filteredEntries.length === 0 ? (
          <Box justifyContent="center" alignItems="center" flexGrow={1}>
            <Text color="gray">No memory entries found</Text>
          </Box>
        ) : (
          <Box flexDirection="column" flexGrow={1}>
            {state.filteredEntries
              .slice(state.page * state.pageSize, (state.page + 1) * state.pageSize)
              .map((entry, index) => {
                const globalIndex = state.page * state.pageSize + index;
                return (
                  <Box key={globalIndex} marginBottom={1}>
                    <Text color={index === state.selectedIndex ? 'green' : 'cyan'}>
                      {index === state.selectedIndex ? '▶' : ' '} {globalIndex + 1}.{' '}
                      {entry.namespace}:{entry.key}
                    </Text>
                    <Text dimColor>
                      {' '}
                      = {JSON.stringify(entry.value).substring(0, 80)}
                      {JSON.stringify(entry.value).length > 80 ? '...' : ''}
                    </Text>
                  </Box>
                );
              })}
          </Box>
        )}
      </Box>

      <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
        <Text color="gray">
          Total: {state.entries.length} entries | Page {state.page + 1} of{' '}
          {Math.ceil(state.filteredEntries.length / state.pageSize)} | Selected:{' '}
          {state.filteredEntries[state.selectedIndex]?.namespace}:
          {state.filteredEntries[state.selectedIndex]?.key || 'None'}
        </Text>
      </Box>
    </Box>
  );

  const renderHelp = () => (
    <Box flexDirection="column" height="100%" width="100%">
      <Box borderStyle="double" borderColor="green" padding={1}>
        <Text bold color="green">
          📖 Help - Memory Manager
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column" flexGrow={1}>
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="cyan">
            Navigation:
          </Text>
          <Text>
            {' '}
            <Text color="cyan">n/p</Text> - Next/Previous entry
          </Text>
          <Text>
            {' '}
            <Text color="cyan">a</Text> - Add new entry
          </Text>
          <Text>
            {' '}
            <Text color="cyan">e</Text> - Edit selected entry
          </Text>
          <Text>
            {' '}
            <Text color="cyan">d</Text> - Delete selected entry
          </Text>
          <Text>
            {' '}
            <Text color="cyan">r</Text> - Refresh entries
          </Text>
          <Text>
            {' '}
            <Text color="cyan">h</Text> - Toggle this help screen
          </Text>
          <Text>
            {' '}
            <Text color="cyan">q/ESC</Text> - Quit/Go back
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="yellow">
            Features:
          </Text>
          <Text>• View all memory entries with pagination</Text>
          <Text>• Navigate with keyboard shortcuts</Text>
          <Text>• Delete entries with confirmation</Text>
          <Text>• Real-time data loading from libSQL database</Text>
          <Text>• External state management for React+Ink compatibility</Text>
        </Box>

        <Box flexDirection="column">
          <Text bold color="magenta">
            Status:
          </Text>
          <Text>• Database: libSQL (.sylphx-flow/memory.db)</Text>
          <Text>• Entries loaded: {state.entries.length}</Text>
          <Text>• Compatibility: React 19.2.0 + Ink 6.3.1</Text>
        </Box>
      </Box>

      <Box borderStyle="single" borderColor="gray" padding={1}>
        <Text dimColor>Press 'h' to go back to list</Text>
      </Box>
    </Box>
  );

  const renderConfirmDelete = () => (
    <Box flexDirection="column" height="100%" width="100%">
      <Box borderStyle="double" borderColor="red" padding={1}>
        <Text bold color="red">
          ⚠️ Confirm Delete
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column" flexGrow={1} justifyContent="center">
        <Box flexDirection="column" marginBottom={2}>
          <Text>
            Delete entry:{' '}
            <Text color="cyan">
              {state.deleteConfirmEntry?.namespace}:{state.deleteConfirmEntry?.key}
            </Text>
          </Text>
          <Box marginTop={1}>
            <Text dimColor>
              Value: {JSON.stringify(state.deleteConfirmEntry?.value).substring(0, 120)}
              {JSON.stringify(state.deleteConfirmEntry?.value || '').length > 120 ? '...' : ''}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Updated: {state.deleteConfirmEntry?.updated_at}</Text>
          </Box>
        </Box>

        <Box flexDirection="column">
          <Text bold color="yellow">
            This action cannot be undone!
          </Text>
          <Box marginTop={1}>
            <Text>
              <Text color="cyan">y</Text> - Yes, delete this entry | <Text color="cyan">n</Text> -
              No, cancel
            </Text>
          </Box>
        </Box>
      </Box>

      <Box borderStyle="single" borderColor="gray" padding={1}>
        <Text dimColor>Press 'n' to cancel, 'y' to confirm deletion</Text>
      </Box>
    </Box>
  );

  // Render based on current view mode
  const renderContent = () => {
    switch (state.viewMode) {
      case 'help':
        return renderHelp();
      case 'confirm-delete':
        return renderConfirmDelete();
      default:
        return renderList();
    }
  };

  return renderContent();
};
