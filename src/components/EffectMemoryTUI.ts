import { Effect, Either, Option } from 'effect';
import { TerminalError, TerminalService } from '../services/service-types.js';
import { TerminalServiceLive, TerminalUtils } from '../services/terminal-service.js';
import { LibSQLMemoryStorage, type MemoryEntry } from '../utils/libsql-storage.js';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

type ViewMode = 'list' | 'view' | 'edit' | 'add' | 'search' | 'help' | 'confirm-delete';

interface TUIState {
  readonly entries: MemoryEntry[];
  readonly filteredEntries: MemoryEntry[];
  readonly loading: boolean;
  readonly message: string;
  readonly viewMode: ViewMode;
  readonly selectedIndex: number;
  readonly selectedEntry: Option.Option<MemoryEntry>;
  readonly deleteConfirmEntry: Option.Option<MemoryEntry>;
  readonly searchQuery: string;
  readonly editForm: { namespace: string; key: string; value: string; cursor: number };
  readonly addForm: {
    readonly namespace: string;
    readonly key: string;
    readonly value: string;
    readonly cursor: number;
    readonly field: 'namespace' | 'key' | 'value';
  };
  readonly viewScrollOffset: number;
  readonly showHelp: boolean;
}

// ============================================================================
// TUI STATE MANAGEMENT
// ============================================================================

const createInitialState = (): TUIState => ({
  entries: [],
  filteredEntries: [],
  loading: false,
  message: '',
  viewMode: 'list',
  selectedIndex: 0,
  selectedEntry: Option.none(),
  deleteConfirmEntry: Option.none(),
  searchQuery: '',
  editForm: { namespace: '', key: '', value: '', cursor: 0 },
  addForm: { namespace: 'default', key: '', value: '', cursor: 0, field: 'namespace' },
  viewScrollOffset: 0,
  showHelp: false,
});

// ============================================================================
// MEMORY OPERATIONS
// ============================================================================

const loadEntries = (memory: LibSQLMemoryStorage) =>
  Effect.gen(function* () {
    const terminal = yield* TerminalService;

    yield* terminal.print('Loading memory entries...');

    const allEntries = yield* Effect.tryPromise({
      try: () => memory.getAll(),
      catch: (error) =>
        new TerminalError(`Failed to load entries: ${error}`, error as Error, 'loadEntries'),
    });

    const sortedEntries = allEntries.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    yield* terminal.success(`Loaded ${allEntries.length} entries`);

    return sortedEntries;
  });

const saveEntry = (memory: LibSQLMemoryStorage, namespace: string, key: string, value: unknown) =>
  Effect.gen(function* () {
    const terminal = yield* TerminalService;

    yield* Effect.tryPromise({
      try: () => memory.set(key, JSON.stringify(value), namespace),
      catch: (error) =>
        new TerminalError(`Failed to save entry: ${error}`, error as Error, 'saveEntry'),
    });

    yield* terminal.success(`Saved: ${namespace}:${key}`);
  });

const deleteEntry = (memory: LibSQLMemoryStorage, entry: MemoryEntry) =>
  Effect.gen(function* () {
    const terminal = yield* TerminalService;

    yield* Effect.tryPromise({
      try: () => memory.delete(entry.key, entry.namespace),
      catch: (error) =>
        new TerminalError(`Failed to delete entry: ${error}`, error as Error, 'deleteEntry'),
    });

    yield* terminal.success(`Deleted: ${entry.namespace}:${entry.key}`);
  });

// ============================================================================
// RENDERING FUNCTIONS
// ============================================================================

const renderHeader = (title: string, subtitle?: string) =>
  Effect.gen(function* () {
    const terminal = yield* TerminalService;
    yield* terminal.print(`┌${'─'.repeat(78)}┐`);
    yield* terminal.print(`│ ${title.padEnd(76)} │`);
    if (subtitle) {
      yield* terminal.print(`│ ${subtitle.padEnd(76)} │`);
    }
    yield* terminal.print(`└${'─'.repeat(78)}┘`);
    yield* terminal.print('');
  });

const renderFooter = (message: string) =>
  Effect.gen(function* () {
    const terminal = yield* TerminalService;
    yield* terminal.print('');
    yield* terminal.print(`┌${'─'.repeat(78)}┐`);
    yield* terminal.print(`│ ${message.padEnd(76)} │`);
    yield* terminal.print(`└${'─'.repeat(78)}┘`);
  });

const renderList = (state: TUIState) =>
  Effect.gen(function* () {
    const terminal = yield* TerminalService;

    yield* renderHeader(
      '🧠 Memory Manager',
      `${state.filteredEntries.length}/${state.entries.length} entries`
    );

    // Help text
    yield* terminal.print(
      'Controls: [↑↓] Select [Enter] View [Space] Edit [n] New [d] Delete [/] Search [r] Refresh [?] Help [q] Quit'
    );
    yield* terminal.print('');

    if (state.message) {
      yield* terminal.warning(state.message);
      yield* terminal.print('');
    }

    if (state.loading) {
      yield* terminal.print('Loading...');
    } else if (state.filteredEntries.length === 0) {
      yield* terminal.print('No entries found', { color: 'gray' });
    } else {
      const startIdx = Math.max(0, state.selectedIndex - 10);
      const endIdx = Math.min(state.filteredEntries.length, startIdx + 20);

      for (let i = startIdx; i < endIdx; i++) {
        const entry = state.filteredEntries[i];
        const isSelected = i === state.selectedIndex;
        const prefix = isSelected ? '▶' : ' ';
        const valuePreview = JSON.stringify(entry.value).substring(0, 60);
        const valueTruncated = JSON.stringify(entry.value).length > 60 ? '...' : '';

        yield* terminal.print(`${prefix} ${i + 1}. ${entry.namespace}:${entry.key}`, {
          color: isSelected ? 'green' : 'cyan',
          bold: isSelected,
        });
        yield* terminal.print(`   = ${valuePreview}${valueTruncated}`, { color: 'gray' });
        yield* terminal.print('');
      }
    }

    const selectedEntry = state.filteredEntries[state.selectedIndex];
    const selectedText = selectedEntry ? `${selectedEntry.namespace}:${selectedEntry.key}` : 'None';

    yield* renderFooter(`Selected: ${selectedText}`);
  });

const renderView = (state: TUIState) =>
  Effect.gen(function* () {
    const terminal = yield* TerminalService;

    if (Option.isNone(state.selectedEntry)) {
      yield* terminal.error('No entry selected');
      return;
    }

    const entry = state.selectedEntry.value;
    yield* renderHeader('📄 View Entry', `${entry.namespace}:${entry.key}`);

    yield* terminal.print('Controls: [↑↓] Scroll [Space] Edit [ESC] Back');
    yield* terminal.print('');

    yield* terminal.print(`Namespace: ${entry.namespace}`, { bold: true, color: 'blue' });
    yield* terminal.print(`Key: ${entry.key}`, { bold: true, color: 'blue' });
    yield* terminal.print(`Updated: ${entry.updated_at}`, { bold: true, color: 'blue' });
    yield* terminal.print('');

    yield* terminal.print('Value:', { bold: true, color: 'blue' });
    const valueStr = JSON.stringify(entry.value, null, 2);
    const lines = valueStr.split('\n');
    const visibleLines = lines.slice(state.viewScrollOffset, state.viewScrollOffset + 15);

    yield* terminal.print('┌' + '─'.repeat(76) + '┐');
    for (const line of visibleLines) {
      yield* terminal.print(`│ ${line.padEnd(76)} │`);
    }
    yield* terminal.print('└' + '─'.repeat(76) + '┘');

    if (lines.length > 15) {
      yield* terminal.print(`--- ${lines.length - 15} more lines ---`, { color: 'gray' });
    }

    yield* renderFooter('View mode');
  });

const renderHelp = () =>
  Effect.gen(function* () {
    const terminal = yield* TerminalService;

    yield* renderHeader('📖 Memory Manager - Help');

    const helpSections = [
      {
        title: 'Basic Operations:',
        items: [
          '↑↓ - Navigate up/down',
          'Enter - View selected entry details',
          'Space - Edit selected entry',
          'n - New entry',
          'd - Delete selected entry',
          '/ - Search entries',
          'r - Refresh list',
        ],
      },
      {
        title: 'Edit Mode:',
        items: [
          'Enter - Save changes',
          'ESC - Cancel edit',
          '↑↓←→ - Navigate text',
          'Backspace - Delete text',
        ],
      },
      {
        title: 'System:',
        items: ['? - Toggle help', 'q - Quit application', 'Ctrl+C - Force exit'],
      },
    ];

    for (const section of helpSections) {
      yield* terminal.print(section.title, { bold: true, color: 'cyan' });
      for (const item of section.items) {
        yield* terminal.print(`  ${item}`);
      }
      yield* terminal.print('');
    }

    yield* renderFooter('Press ? to close help');
  });

const render = (state: TUIState) =>
  Effect.gen(function* () {
    yield* TerminalUtils.clear();

    switch (state.viewMode) {
      case 'view':
        yield* renderView(state);
        break;
      case 'help':
        yield* renderHelp();
        break;
      default:
        yield* renderList(state);
        break;
    }
  });

// ============================================================================
// INPUT HANDLING
// ============================================================================

const handleListInput = (
  key: string,
  state: TUIState,
  memory: LibSQLMemoryStorage
): Effect.Effect<TUIState, TerminalError, TerminalService> =>
  Effect.gen(function* () {
    const terminal = yield* TerminalService;
    const newState = { ...state };

    switch (key) {
      case 'up':
        newState.selectedIndex = Math.max(0, state.selectedIndex - 1);
        break;
      case 'down':
        newState.selectedIndex = Math.min(
          state.filteredEntries.length - 1,
          state.selectedIndex + 1
        );
        break;
      case 'enter':
        if (state.filteredEntries[state.selectedIndex]) {
          newState.selectedEntry = Option.some(state.filteredEntries[state.selectedIndex]);
          newState.viewMode = 'view';
          newState.viewScrollOffset = 0;
        }
        break;
      case 'r':
        const entries = yield* loadEntries(memory);
        newState.entries = entries;
        newState.filteredEntries = entries;
        newState.selectedIndex = Math.min(state.selectedIndex, Math.max(0, entries.length - 1));
        break;
      case '?':
        newState.showHelp = !state.showHelp;
        newState.viewMode = state.showHelp ? 'help' : 'list';
        break;
      case 'q':
        yield* terminal.print('Goodbye!');
        return yield* Effect.fail(new TerminalError('User quit'));
    }

    return newState;
  });

const handleViewInput = (
  key: string,
  state: TUIState
): Effect.Effect<TUIState, TerminalError, TerminalService> =>
  Effect.gen(function* () {
    const newState = { ...state };

    switch (key) {
      case 'up':
        newState.viewScrollOffset = Math.max(0, state.viewScrollOffset - 1);
        break;
      case 'down':
        newState.viewScrollOffset = state.viewScrollOffset + 1;
        break;
      case 'escape':
        newState.viewMode = 'list';
        break;
    }

    return newState;
  });

const handleInput = (
  key: string,
  state: TUIState,
  memory: LibSQLMemoryStorage
): Effect.Effect<TUIState, TerminalError, TerminalService> =>
  Effect.gen(function* () {
    switch (state.viewMode) {
      case 'list':
        return yield* handleListInput(key, state, memory);
      case 'view':
        return yield* handleViewInput(key, state);
      case 'help':
        if (key === '?') {
          return { ...state, viewMode: 'list', showHelp: false };
        }
        return state;
      default:
        return state;
    }
  });

// ============================================================================
// MAIN TUI LOOP
// ============================================================================

const createInputHandler = (): Effect.Effect<string, TerminalError, never> =>
  Effect.async<string, TerminalError>((resume) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key: string) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
      resume(Effect.succeed(key));
    };

    process.stdin.on('data', onData);
  });

const normalizeInput = (input: string): string => {
  return input === '\u0003'
    ? 'ctrl+c'
    : input === '\u001b'
      ? 'escape'
      : input === '\r'
        ? 'enter'
        : input === '\u001b[A'
          ? 'up'
          : input === '\u001b[B'
            ? 'down'
            : input === '\u001b[C'
              ? 'right'
              : input === '\u001b[D'
                ? 'left'
                : input === ' '
                  ? 'space'
                  : input.toLowerCase();
};

export const runMemoryTUI = () =>
  Effect.gen(function* () {
    const terminal = yield* TerminalService;
    const memory = new LibSQLMemoryStorage();

    // Initial setup
    yield* terminal.print('Starting Memory Manager...');
    const entries = yield* loadEntries(memory);

    let state: TUIState = {
      ...createInitialState(),
      entries,
      filteredEntries: entries,
    };

    // Main loop
    while (true) {
      yield* render(state);

      const input = yield* createInputHandler();
      const key = normalizeInput(input);

      try {
        state = yield* handleInput(key, state, memory);
      } catch (error) {
        if (error instanceof TerminalError && error.message === 'User quit') {
          break;
        }
        throw error;
      }
    }

    yield* TerminalUtils.clear();
    yield* terminal.print('Memory Manager closed.');
  }).pipe(
    Effect.provide(TerminalServiceLive),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        const terminal = yield* TerminalService;
        yield* TerminalUtils.clear();
        yield* terminal.error(`Error: ${error.message}`);
      })
    )
  );
