import { Box, Text, useApp, useInput } from 'ink';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LibSQLMemoryStorage, type MemoryEntry } from '../utils/libsql-storage.js';

type ViewMode = 'list' | 'view' | 'edit' | 'add' | 'search' | 'help' | 'confirm-delete';

interface FullscreenTUIState {
  entries: MemoryEntry[];
  filteredEntries: MemoryEntry[];
  loading: boolean;
  message: string;
  viewMode: ViewMode;
  selectedIndex: number;
  selectedEntry: MemoryEntry | null;
  deleteConfirmEntry: MemoryEntry | null;
  searchQuery: string;
  editForm: { namespace: string; key: string; value: string; cursor: number };
  addForm: {
    namespace: string;
    key: string;
    value: string;
    cursor: number;
    field: 'namespace' | 'key' | 'value';
  };
  viewScrollOffset: number;
  showHelp: boolean;
}

export const FullscreenMemoryTUI: React.FC = () => {
  const { exit } = useApp();
  const [state, setState] = useState<FullscreenTUIState>({
    entries: [],
    filteredEntries: [],
    loading: false,
    message: '',
    viewMode: 'list',
    selectedIndex: 0,
    selectedEntry: null,
    deleteConfirmEntry: null,
    searchQuery: '',
    editForm: { namespace: '', key: '', value: '', cursor: 0 },
    addForm: { namespace: 'default', key: '', value: '', cursor: 0, field: 'namespace' },
    viewScrollOffset: 0,
    showHelp: false,
  });

  const memory = useMemo(() => new LibSQLMemoryStorage(), []);

  const loadEntries = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, message: 'Loading...' }));

    try {
      const allEntries = await memory.getAll();
      const sortedEntries = allEntries.sort(
        (a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setState((prev) => ({
        ...prev,
        entries: sortedEntries,
        filteredEntries: sortedEntries,
        loading: false,
        message: `Loaded ${allEntries.length} entries`,
        selectedIndex: Math.min(prev.selectedIndex, Math.max(0, sortedEntries.length - 1)),
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        message: `Error: ${error}`,
      }));
    }
  }, []);

  const saveEntry = useCallback(
    async (namespace: string, key: string, value: any) => {
      try {
        await memory.set(key, value, namespace);
        setState((prev) => ({
          ...prev,
          message: `Saved: ${namespace}:${key}`,
          viewMode: 'list',
        }));
        await loadEntries();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          message: `Save error: ${error}`,
        }));
      }
    },
    [loadEntries]
  );

  const deleteEntry = useCallback(
    async (entry: MemoryEntry) => {
      try {
        await memory.delete(entry.key, entry.namespace);
        setState((prev) => ({
          ...prev,
          message: `Deleted: ${entry.namespace}:${entry.key}`,
          viewMode: 'list',
          deleteConfirmEntry: null,
        }));
        await loadEntries();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          message: `Delete error: ${error}`,
        }));
      }
    },
    [loadEntries]
  );

  const searchEntries = useCallback((query: string, entries: MemoryEntry[]) => {
    if (!query.trim()) {
      setState((prev) => ({ ...prev, filteredEntries: entries }));
      return;
    }

    const filtered = entries.filter(
      (entry) =>
        entry.namespace.toLowerCase().includes(query.toLowerCase()) ||
        entry.key.toLowerCase().includes(query.toLowerCase()) ||
        JSON.stringify(entry.value).toLowerCase().includes(query.toLowerCase())
    );

    setState((prev) => ({
      ...prev,
      filteredEntries: filtered,
      selectedIndex: 0,
    }));
  }, []);

  // Initial load
  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useInput((input, key) => {
    // Global shortcuts
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }

    if (key.escape) {
      if (state.viewMode !== 'list') {
        setState((prev) => ({ ...prev, viewMode: 'list' }));
      } else {
        exit();
      }
      return;
    }

    if (input === '?' || (key.ctrl && input === 'h')) {
      setState((prev) => ({ ...prev, showHelp: !prev.showHelp }));
      return;
    }

    // List view - intuitive controls
    if (state.viewMode === 'list') {
      if (key.upArrow && state.selectedIndex > 0) {
        setState((prev) => ({ ...prev, selectedIndex: prev.selectedIndex - 1 }));
      } else if (key.downArrow && state.selectedIndex < state.filteredEntries.length - 1) {
        setState((prev) => ({ ...prev, selectedIndex: prev.selectedIndex + 1 }));
      } else if (key.return && state.filteredEntries[state.selectedIndex]) {
        // Enter to view details
        const entry = state.filteredEntries[state.selectedIndex];
        setState((prev) => ({
          ...prev,
          selectedEntry: entry,
          viewMode: 'view',
          viewScrollOffset: 0,
        }));
      } else if (input === ' ' && state.filteredEntries[state.selectedIndex]) {
        // Space to edit
        const entry = state.filteredEntries[state.selectedIndex];
        setState((prev) => ({
          ...prev,
          editForm: {
            namespace: entry.namespace,
            key: entry.key,
            value: JSON.stringify(entry.value, null, 2),
            cursor: 0,
          },
          viewMode: 'edit',
        }));
      } else if (input === 'n') {
        // n for new entry
        setState((prev) => ({
          ...prev,
          addForm: { namespace: 'default', key: '', value: '', cursor: 0, field: 'namespace' },
          viewMode: 'add',
        }));
      } else if (input === 'd' && state.filteredEntries[state.selectedIndex]) {
        // d to delete
        setState((prev) => ({
          ...prev,
          deleteConfirmEntry: prev.filteredEntries[prev.selectedIndex],
          viewMode: 'confirm-delete',
        }));
      } else if (input === '/') {
        // / to search
        setState((prev) => ({ ...prev, viewMode: 'search', searchQuery: '' }));
      } else if (input === 'r') {
        // r to refresh
        loadEntries();
      }
    }

    // View mode
    if (state.viewMode === 'view') {
      if (key.upArrow && state.viewScrollOffset > 0) {
        setState((prev) => ({ ...prev, viewScrollOffset: prev.viewScrollOffset - 1 }));
      } else if (key.downArrow) {
        setState((prev) => ({ ...prev, viewScrollOffset: prev.viewScrollOffset + 1 }));
      } else if (input === ' ') {
        // Space to edit from view
        if (state.selectedEntry) {
          setState((prev) => ({
            ...prev,
            editForm: {
              namespace: state.selectedEntry?.namespace,
              key: state.selectedEntry?.key,
              value: JSON.stringify(state.selectedEntry?.value, null, 2),
              cursor: 0,
            },
            viewMode: 'edit',
          }));
        }
      }
    }

    // Edit mode - full text editing
    if (state.viewMode === 'edit') {
      if (key.return) {
        // Enter to save
        try {
          const value = JSON.parse(state.editForm.value);
          saveEntry(state.editForm.namespace, state.editForm.key, value);
        } catch (error) {
          setState((prev) => ({ ...prev, message: `JSON format error: ${error}` }));
        }
      } else if (key.backspace || key.delete) {
        const newValue = state.editForm.value.slice(0, -1);
        setState((prev) => ({
          ...prev,
          editForm: {
            ...prev.editForm,
            value: newValue,
            cursor: Math.max(0, prev.editForm.cursor - 1),
          },
        }));
      } else if (input && !key.ctrl && !key.meta && input.length === 1) {
        const newValue = state.editForm.value + input;
        setState((prev) => ({
          ...prev,
          editForm: { ...prev.editForm, value: newValue, cursor: prev.editForm.cursor + 1 },
        }));
      } else if (key.leftArrow && state.editForm.cursor > 0) {
        setState((prev) => ({
          ...prev,
          editForm: { ...prev.editForm, cursor: prev.editForm.cursor - 1 },
        }));
      } else if (key.rightArrow && state.editForm.cursor < state.editForm.value.length) {
        setState((prev) => ({
          ...prev,
          editForm: { ...prev.editForm, cursor: prev.editForm.cursor + 1 },
        }));
      }
    }

    // Add mode - form editing
    if (state.viewMode === 'add') {
      if (key.tab) {
        // Tab to switch fields
        const fields: Array<'namespace' | 'key' | 'value'> = ['namespace', 'key', 'value'];
        const currentIndex = fields.indexOf(state.addForm.field);
        const nextIndex = (currentIndex + 1) % fields.length;
        setState((prev) => ({
          ...prev,
          addForm: { ...prev.addForm, field: fields[nextIndex], cursor: 0 },
        }));
      } else if (key.return && state.addForm.field === 'value') {
        // Enter on value field to save
        try {
          const value = JSON.parse(state.addForm.value);
          saveEntry(state.addForm.namespace, state.addForm.key, value);
        } catch (error) {
          setState((prev) => ({ ...prev, message: `JSON format error: ${error}` }));
        }
      } else if (key.backspace || key.delete) {
        const currentValue = state.addForm[state.addForm.field];
        const newValue = currentValue.slice(0, -1);
        setState((prev) => ({
          ...prev,
          addForm: {
            ...prev.addForm,
            [state.addForm.field]: newValue,
            cursor: Math.max(0, prev.addForm.cursor - 1),
          },
        }));
      } else if (input && !key.ctrl && !key.meta && input.length === 1) {
        const currentValue = state.addForm[state.addForm.field];
        const newValue = currentValue + input;
        setState((prev) => ({
          ...prev,
          addForm: {
            ...prev.addForm,
            [state.addForm.field]: newValue,
            cursor: prev.addForm.cursor + 1,
          },
        }));
      }
    }

    // Search mode
    if (state.viewMode === 'search') {
      if (key.return) {
        searchEntries(state.searchQuery, state.entries);
        setState((prev) => ({ ...prev, viewMode: 'list' }));
      } else if (key.backspace || key.delete) {
        const newQuery = state.searchQuery.slice(0, -1);
        setState((prev) => ({ ...prev, searchQuery: newQuery }));
        searchEntries(newQuery, state.entries);
      } else if (input && !key.ctrl && !key.meta && input.length === 1) {
        const newQuery = state.searchQuery + input;
        setState((prev) => ({ ...prev, searchQuery: newQuery }));
        searchEntries(newQuery, state.entries);
      }
    }

    // Confirm delete
    if (state.viewMode === 'confirm-delete') {
      if (input === 'y' && state.deleteConfirmEntry) {
        deleteEntry(state.deleteConfirmEntry);
      } else if (input === 'n' || key.escape) {
        setState((prev) => ({
          ...prev,
          viewMode: 'list',
          deleteConfirmEntry: null,
        }));
      }
    }
  });

  const renderList = () => (
    <Box flexDirection="column" height="100%" width="100%">
      <Box borderStyle="double" borderColor="blue" padding={1}>
        <Text bold color="blue">
          🧠 Memory Manager
        </Text>
        <Text color="gray">
          {' '}
          | {state.filteredEntries.length}/{state.entries.length} entries
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          [↑↓] Select [Enter] View [Space] Edit [n] New [d] Delete [/] Search [r] Refresh [?] Help
          [Ctrl+C] Quit
        </Text>
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
            <Text color="gray">No entries found</Text>
          </Box>
        ) : (
          <Box flexDirection="column" flexGrow={1}>
            {state.filteredEntries.map((entry, index) => (
              <Box key={`${entry.namespace}-${entry.key}-${index}`} marginBottom={1}>
                <Text color={index === state.selectedIndex ? 'green' : 'cyan'}>
                  {index === state.selectedIndex ? '▶' : ' '} {index + 1}. {entry.namespace}:
                  {entry.key}
                </Text>
                <Text dimColor>
                  {' '}
                  = {JSON.stringify(entry.value).substring(0, 80)}
                  {JSON.stringify(entry.value).length > 80 ? '...' : ''}
                </Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
        <Text color="gray">
          Selected: {state.filteredEntries[state.selectedIndex]?.namespace}:
          {state.filteredEntries[state.selectedIndex]?.key || 'None'}
        </Text>
      </Box>
    </Box>
  );

  const renderView = () => {
    if (!state.selectedEntry) {
      return null;
    }

    const valueStr = JSON.stringify(state.selectedEntry.value, null, 2);
    const lines = valueStr.split('\n');
    const visibleLines = lines.slice(state.viewScrollOffset, state.viewScrollOffset + 20);

    return (
      <Box flexDirection="column" height="100%" width="100%">
        <Box borderStyle="double" borderColor="cyan" padding={1}>
          <Text bold color="cyan">
            📄 View Entry
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text color="gray">[↑↓] Scroll [Space] Edit [ESC] Back</Text>
        </Box>

        <Box marginTop={1} flexDirection="column" flexGrow={1}>
          <Box marginBottom={1}>
            <Text bold color="blue">
              Namespace:
            </Text>
            <Text> {state.selectedEntry.namespace}</Text>
          </Box>

          <Box marginBottom={1}>
            <Text bold color="blue">
              Key:
            </Text>
            <Text> {state.selectedEntry.key}</Text>
          </Box>

          <Box marginBottom={1}>
            <Text bold color="blue">
              Updated:
            </Text>
            <Text> {state.selectedEntry.updated_at}</Text>
          </Box>

          <Box flexDirection="column" flexGrow={1}>
            <Text bold color="blue">
              Value:
            </Text>
            <Box
              flexDirection="column"
              borderStyle="single"
              borderColor="gray"
              padding={1}
              flexGrow={1}
            >
              {visibleLines.map((line, index) => (
                <Text key={index}>{line}</Text>
              ))}
              {lines.length > 20 && (
                <Text color="gray">--- {lines.length - 20} more lines ---</Text>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  const renderEdit = () => (
    <Box flexDirection="column" height="100%" width="100%">
      <Box borderStyle="double" borderColor="yellow" padding={1}>
        <Text bold color="yellow">
          ✏️ Edit Entry
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">[Enter] Save [ESC] Cancel [↑↓←→] Navigate text</Text>
      </Box>

      <Box marginTop={1} flexDirection="column" flexGrow={1}>
        <Box marginBottom={1}>
          <Text bold color="blue">
            Namespace:
          </Text>
          <Text> {state.editForm.namespace}</Text>
        </Box>

        <Box marginBottom={1}>
          <Text bold color="blue">
            Key:
          </Text>
          <Text> {state.editForm.key}</Text>
        </Box>

        <Box flexDirection="column" flexGrow={1}>
          <Text bold color="blue">
            JSON Value:
          </Text>
          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor="gray"
            padding={1}
            flexGrow={1}
          >
            <Text>Edit JSON content:</Text>
            <Box marginTop={1}>
              <Text color="cyan">{state.editForm.value}</Text>
              <Text>_</Text>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
        <Text color="gray">Tip: Enter valid JSON format, then press Enter to save</Text>
      </Box>
    </Box>
  );

  const renderAdd = () => (
    <Box flexDirection="column" height="100%" width="100%">
      <Box borderStyle="double" borderColor="green" padding={1}>
        <Text bold color="green">
          ➕ Add Entry
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">[Tab] Switch fields [Enter] Save [ESC] Cancel</Text>
      </Box>

      <Box marginTop={1} flexDirection="column" flexGrow={1}>
        <Box marginBottom={1}>
          <Text bold color={state.addForm.field === 'namespace' ? 'green' : 'blue'}>
            Namespace: {state.addForm.namespace}
            {state.addForm.field === 'namespace' && <Text>_</Text>}
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text bold color={state.addForm.field === 'key' ? 'green' : 'blue'}>
            Key: {state.addForm.key}
            {state.addForm.field === 'key' && <Text>_</Text>}
          </Text>
        </Box>

        <Box flexDirection="column" flexGrow={1}>
          <Text bold color={state.addForm.field === 'value' ? 'green' : 'blue'}>
            JSON Value:
          </Text>
          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor="gray"
            padding={1}
            flexGrow={1}
          >
            <Text>Enter JSON value:</Text>
            <Box marginTop={1}>
              <Text color="cyan">{state.addForm.value}</Text>
              {state.addForm.field === 'value' && <Text>_</Text>}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
        <Text color="gray">
          Current field: {state.addForm.field} | Tab to switch | Enter to save on value field
        </Text>
      </Box>
    </Box>
  );

  const renderSearch = () => (
    <Box flexDirection="column" height="100%" width="100%">
      <Box borderStyle="double" borderColor="magenta" padding={1}>
        <Text bold color="magenta">
          🔍 Search Entries
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Type search term, Enter to confirm, ESC to cancel</Text>
      </Box>

      <Box marginTop={1}>
        <Text>Search: </Text>
        <Text color="cyan">{state.searchQuery}</Text>
        <Text>_</Text>
      </Box>

      <Box marginTop={1} flexDirection="column" flexGrow={1}>
        <Text color="gray">Found {state.filteredEntries.length} results:</Text>
        {state.filteredEntries.slice(0, 10).map((entry, index) => (
          <Box key={index}>
            <Text>
              • {entry.namespace}:{entry.key}
            </Text>
          </Box>
        ))}
        {state.filteredEntries.length > 10 && (
          <Text color="gray">... and {state.filteredEntries.length - 10} more results</Text>
        )}
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
        </Box>

        <Box flexDirection="column">
          <Text bold color="yellow">
            This action cannot be undone!
          </Text>
          <Box marginTop={1}>
            <Text>
              <Text color="cyan">y</Text> - Yes, delete | <Text color="cyan">n</Text> - No, cancel |{' '}
              <Text color="cyan">ESC</Text> - Back
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const renderHelp = () => (
    <Box flexDirection="column" height="100%" width="100%">
      <Box borderStyle="double" borderColor="green" padding={1}>
        <Text bold color="green">
          📖 Memory Manager - Help
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column" flexGrow={1}>
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="cyan">
            Basic Operations:
          </Text>
          <Text>
            {' '}
            <Text color="cyan">↑↓</Text> - Navigate up/down
          </Text>
          <Text>
            {' '}
            <Text color="cyan">Enter</Text> - View selected entry details
          </Text>
          <Text>
            {' '}
            <Text color="cyan">Space</Text> - Edit selected entry
          </Text>
          <Text>
            {' '}
            <Text color="cyan">n</Text> - New entry
          </Text>
          <Text>
            {' '}
            <Text color="cyan">d</Text> - Delete selected entry
          </Text>
          <Text>
            {' '}
            <Text color="cyan">/</Text> - Search entries
          </Text>
          <Text>
            {' '}
            <Text color="cyan">r</Text> - Refresh list
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="cyan">
            Edit Mode:
          </Text>
          <Text>
            {' '}
            <Text color="cyan">Enter</Text> - Save changes
          </Text>
          <Text>
            {' '}
            <Text color="cyan">ESC</Text> - Cancel edit
          </Text>
          <Text>
            {' '}
            <Text color="cyan">↑↓←→</Text> - Navigate text
          </Text>
          <Text>
            {' '}
            <Text color="cyan">Backspace</Text> - Delete text
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="cyan">
            Add Mode:
          </Text>
          <Text>
            {' '}
            <Text color="cyan">Tab</Text> - Switch fields (Namespace→Key→Value)
          </Text>
          <Text>
            {' '}
            <Text color="cyan">Enter</Text> - Save on value field
          </Text>
          <Text>
            {' '}
            <Text color="cyan">ESC</Text> - Cancel add
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text bold color="cyan">
            System:
          </Text>
          <Text>
            {' '}
            <Text color="cyan">?</Text> or <Text color="cyan">Ctrl+H</Text> - Toggle help
          </Text>
          <Text>
            {' '}
            <Text color="cyan">ESC</Text> - Go back / Exit
          </Text>
          <Text>
            {' '}
            <Text color="cyan">Ctrl+C</Text> - Force exit
          </Text>
        </Box>
      </Box>

      <Box borderStyle="single" borderColor="gray" padding={1}>
        <Text dimColor>Press ? or Ctrl+H to close help</Text>
      </Box>
    </Box>
  );

  // Main render logic
  if (state.showHelp) {
    return renderHelp();
  }

  switch (state.viewMode) {
    case 'view':
      return renderView();
    case 'edit':
      return renderEdit();
    case 'add':
      return renderAdd();
    case 'search':
      return renderSearch();
    case 'confirm-delete':
      return renderConfirmDelete();
    default:
      return renderList();
  }
};
