import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import chalk from 'chalk';

interface AgentStatus {
  name: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  output: string[];
  progress: number;
  startTime?: number;
  endTime?: number;
}

interface BenchmarkStatus {
  agents: AgentStatus[];
  totalAgents: number;
  completedAgents: number;
  outputDir: string;
  startTime: Date;
  task: string;
  concurrency: number;
}

const BenchmarkUI: React.FC = () => {
  const [status, setStatus] = useState<BenchmarkStatus | null>(null);
  const { exit } = useApp();

  // Listen for status updates via stdin
  useEffect(() => {
    const handleStdin = (data: Buffer) => {
      try {
        const message = data.toString().trim();
        if (message.startsWith('BENCHMARK_STATUS:')) {
          const statusData = JSON.parse(message.substring(16));
          setStatus(statusData);
        }
      } catch (error) {
        // Ignore parsing errors
      }
    };

    process.stdin.on('data', handleStdin);
    return () => {
      process.stdin.off('data', handleStdin);
    };
  }, []);

  // Check if benchmark is complete
  useEffect(() => {
    if (status && status.completedAgents === status.totalAgents) {
      setTimeout(() => exit(), 2000);
    }
  }, [status, exit]);

  if (!status) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="cyan">🤖 Initializing Benchmark Terminal UI...</Text>
        <Text color="gray">Waiting for benchmark to start...</Text>
      </Box>
    );
  }

  const { agents, totalAgents, completedAgents, outputDir, startTime, task, concurrency } = status;
  const elapsed = Date.now() - startTime.getTime();
  const progressPercent = totalAgents > 0 ? (completedAgents / totalAgents) * 100 : 0;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box borderStyle="single" padding={1} marginBottom={1}>
        <Text color="cyan" bold>🎯 Agent Benchmark Monitor</Text>
        <Text color="gray">Task: {task}</Text>
        <Text color="gray">Output: {outputDir}</Text>
        <Text color="gray">Concurrency: {concurrency}</Text>
        <Text color="gray">Time: {Math.floor(elapsed / 1000)}s</Text>
      </Box>

      {/* Progress Bar */}
      <Box marginBottom={1}>
        <Text>
          Progress: {chalk.green('█'.repeat(Math.floor(progressPercent / 10)))}
          {chalk.gray('░'.repeat(10 - Math.floor(progressPercent / 10)))}
          {' '} {completedAgents}/{totalAgents} ({progressPercent.toFixed(1)}%)
        </Text>
      </Box>

      {/* Agent Status Grid */}
      <Box flexDirection="column" gap={1}>
        <Text color="white" bold>📊 Agent Status:</Text>
        {agents.map((agent) => (
          <Box key={agent.name} borderStyle="round" padding={1}>
            <Box justifyContent="space-between">
              <Text bold>
                {agent.name}
                {' '}
                {agent.status === 'completed' && chalk.green('✅')}
                {agent.status === 'running' && chalk.yellow('🔄')}
                {agent.status === 'error' && chalk.red('❌')}
                {agent.status === 'idle' && chalk.gray('⏸️')}
              </Text>
              <Text color="gray">
                {agent.progress > 0 && `${agent.progress}%`}
              </Text>
            </Box>

            {/* Show last 3 lines of output */}
            {agent.output.length > 0 && (
              <Box flexDirection="column" marginTop={1}>
                {agent.output.slice(-3).map((line, i) => (
                  <Text key={i} color="gray" dimColor>
                    {line}
                  </Text>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        {completedAgents === totalAgents ? (
          <Text color="green" bold>🎉 Benchmark Completed!</Text>
        ) : (
          <Text color="yellow">🔄 Running... (Press Ctrl+C to stop)</Text>
        )}
      </Box>
    </Box>
  );
};

export default BenchmarkUI;