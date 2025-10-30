import { Box, Text, render, useApp } from 'ink';
import React from 'react';

export interface ReindexProgressData {
  current: number;
  total: number;
  fileName: string;
  status: 'processing' | 'completed' | 'skipped';
  phase: 'tokenizing' | 'calculating' | 'completed';
  mode?: 'tfidf-only' | 'semantic';
  stats?: {
    documentsProcessed: number;
    uniqueTerms: number;
  };
}

export class ReindexMonitor {
  private progress: ReindexProgressData = {
    current: 0,
    total: 0,
    fileName: '',
    status: 'processing',
    phase: 'tokenizing',
  };
  private uiInstance?: any;
  private listeners = new Set<() => void>();
  private startTime = Date.now();
  private lastPercentage = -1; // Track last rendered percentage

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private triggerUpdate() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  getProgress() {
    return this.progress;
  }

  getElapsedTime() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  updateProgress(data: Partial<ReindexProgressData>) {
    this.progress = { ...this.progress, ...data };

    // Only trigger UI update when percentage changes (to reduce render overhead)
    const currentPercentage =
      this.progress.total > 0 ? Math.floor((this.progress.current / this.progress.total) * 100) : 0;

    // Always trigger on phase change or when percentage actually changes
    if (data.phase || currentPercentage !== this.lastPercentage) {
      this.lastPercentage = currentPercentage;
      this.triggerUpdate();
    }
  }

  start(total: number) {
    this.progress = {
      current: 0,
      total,
      fileName: '',
      status: 'processing',
      phase: 'tokenizing',
    };
    this.startTime = Date.now();

    // Force Ink to work by ensuring proper terminal detection
    process.stdout.isTTY = true;
    process.stderr.isTTY = true;

    const uiInstance = render(<ReindexProgress monitor={this} />, {
      debug: false,
      patchConsole: false, // Don't patch console to allow direct stderr output
      exitOnCtrlC: false,
    });

    this.uiInstance = uiInstance;
  }

  stop() {
    if (this.uiInstance) {
      this.uiInstance.unmount();
      this.uiInstance = undefined;
    }
  }
}

interface ReindexProgressProps {
  monitor: ReindexMonitor;
}

const ReindexProgress: React.FC<ReindexProgressProps> = ({ monitor }) => {
  const { exit } = useApp();
  // Use React state instead of reading from monitor directly
  const [progress, setProgress] = React.useState<ReindexProgressData>(monitor.getProgress());
  const [elapsedTime, setElapsedTime] = React.useState(0);

  // Subscribe to progress updates and update React state
  React.useEffect(() => {
    const unsubscribe = monitor.subscribe(() => {
      const newProgress = monitor.getProgress();
      setProgress(newProgress);
      setElapsedTime(monitor.getElapsedTime());

      // Show progress updates (Ink UI is too slow to render, so we use console.error for immediate feedback)
      if (newProgress.current % 20 === 0) {
        const percentage = Math.floor((newProgress.current / newProgress.total) * 100);
        console.error(`📦 ${newProgress.current}/${newProgress.total} files (${percentage}%)`);
      }
    });
    return unsubscribe;
  }, [monitor]);

  // Update elapsed time every second (not every 100ms)
  React.useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(monitor.getElapsedTime());
    }, 1000); // Every 1 second instead of 100ms
    return () => clearInterval(interval);
  }, [monitor]);
  const percentage = progress.total > 0 ? Math.floor((progress.current / progress.total) * 100) : 0;

  // Calculate estimated time remaining
  const avgTimePerFile = progress.current > 0 ? elapsedTime / progress.current : 0;
  const remainingFiles = progress.total - progress.current;
  const estimatedRemaining = Math.ceil(avgTimePerFile * remainingFiles);

  // Build progress bar
  const barWidth = 40;
  const filledWidth = Math.floor((percentage / 100) * barWidth);
  const progressBar = '█'.repeat(filledWidth) + '░'.repeat(barWidth - filledWidth);

  // Auto-exit when completed
  React.useEffect(() => {
    if (progress.phase === 'completed') {
      setTimeout(() => {
        exit();
      }, 1000);
    }
  }, [progress.phase, exit]);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🔤 Reindexing Codebase
        </Text>
        {progress.mode === 'tfidf-only' && (
          <Text color="yellow" dimColor>
            {' '}
            (TF-IDF mode - no API key)
          </Text>
        )}
        {progress.mode === 'semantic' && (
          <Text color="green" dimColor>
            {' '}
            (Semantic search enabled)
          </Text>
        )}
      </Box>

      {/* API key hint */}
      {progress.mode === 'tfidf-only' && progress.phase === 'tokenizing' && (
        <Box marginBottom={1}>
          <Text color="gray" dimColor>
            💡 Tip: Set OPENAI_API_KEY for semantic search with embeddings
          </Text>
        </Box>
      )}

      {/* Progress bar */}
      <Box marginBottom={1}>
        <Box width={barWidth + 2} marginRight={2}>
          <Text color="blue">{progressBar}</Text>
        </Box>
        <Text color="cyan" bold>
          {percentage}%
        </Text>
      </Box>

      {/* Current file and stats */}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color="gray">Progress: </Text>
          <Text color="white">
            {progress.current}/{progress.total} files
          </Text>
        </Box>

        {progress.phase === 'tokenizing' && progress.fileName && (
          <Box>
            <Text color="gray">Current: </Text>
            <Text color="yellow">{progress.fileName}</Text>
          </Box>
        )}

        {progress.phase === 'calculating' && (
          <Box>
            <Text color="cyan">⚡ Calculating TF-IDF scores...</Text>
          </Box>
        )}
      </Box>

      {/* Timing info */}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color="gray">Elapsed: </Text>
          <Text color="white">{formatTime(elapsedTime)}</Text>
        </Box>

        {progress.phase === 'tokenizing' && remainingFiles > 0 && (
          <Box>
            <Text color="gray">Estimated: </Text>
            <Text color="white">{formatTime(estimatedRemaining)} remaining</Text>
          </Box>
        )}
      </Box>

      {/* Final stats when completed */}
      {progress.phase === 'completed' && progress.stats && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="green" bold>
            ✓ Indexing Complete!
          </Text>
          <Box marginTop={1}>
            <Text color="gray">Documents: </Text>
            <Text color="white">{progress.stats.documentsProcessed}</Text>
          </Box>
          <Box>
            <Text color="gray">Unique terms: </Text>
            <Text color="white">{progress.stats.uniqueTerms.toLocaleString()}</Text>
          </Box>
          <Box>
            <Text color="gray">Total time: </Text>
            <Text color="white">{formatTime(elapsedTime)}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

export { ReindexProgress };
