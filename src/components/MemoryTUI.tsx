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
}

// External state to work around React+Ink compatibility issue
const externalState = {
  entries: [] as MemoryEntry[],
  loading: false,
  message: '',
  renderKey: 0,
};

export const MemoryTUI: React.FC = () => {
  const { exit } = useApp();
  const [, forceUpdate] = useState({});
  const memory = new LibSQLMemoryStorage();

  // Force re-render function
  const forceRender = useCallback(() => {
    externalState.renderKey++;
    forceUpdate({});
  }, []);

  // Get current state from external state
  const getState = (): TUIState => ({
    entries: externalState.entries,
    filteredEntries: filterEntries(externalState.entries),
    loading: externalState.loading,
    message: externalState.message,
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
  });

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
    <Box flexDirection="column">
      {renderHeader()}

      <Box marginTop={1}>
        <Text color="gray">[a]dd [e]dit [d]elete [r]efresh [h]elp [q]uit | [n]ext [p]rev</Text>
      </Box>

      {state.message && (
        <Box marginTop={1}>
          <Text color="yellow">{state.message}</Text>
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        {state.loading ? (
          <Text>Loading...</Text>
        ) : state.filteredEntries.length === 0 ? (
          <Text color="gray">No memory entries found</Text>
        ) : (
          state.filteredEntries
            .slice(state.page * state.pageSize, (state.page + 1) * state.pageSize)
            .map((entry, index) => (
              <Box key={`${entry.namespace}-${entry.key}-${entry.timestamp}`}>
                <Text color={index === state.selectedIndex ? 'green' : 'cyan'}>
                  {index === state.selectedIndex ? '▶' : ' '}{' '}
                  {state.page * state.pageSize + index + 1}. {entry.namespace}:{entry.key}
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

      <Box marginTop={1}>
        <Text dimColor>Press 'h' to go back to list</Text>
      </Box>
    </Box>
  );

  const renderConfirmDelete = () => (
    <Box flexDirection="column">
      <Box borderStyle="double" borderColor="red" padding={1}>
        <Text bold color="red">
          ⚠️ Confirm Delete
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text>
          Delete entry:{' '}
          <Text color="cyan">
            {state.deleteConfirmEntry?.namespace}:{state.deleteConfirmEntry?.key}
          </Text>
        </Text>
        <Text dimColor>
          Value: {JSON.stringify(state.deleteConfirmEntry?.value).substring(0, 100)}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text>
          <Text color="cyan">y</Text> - Yes, delete | <Text color="cyan">n</Text> - No, cancel
        </Text>
      </Box>
    </Box>
  );

  // Render based on current view mode
  switch (state.viewMode) {
    case 'help':
      return renderHelp();
    case 'confirm-delete':
      return renderConfirmDelete();
    default:
      return renderList();
  }
};
