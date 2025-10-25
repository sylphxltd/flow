import React from 'react';
import { Box, Text, useApp, render } from 'ink';
import path from 'node:path';
import type { AgentData, InitialInfo } from '../types/benchmark.js';

export interface InkMonitorProps {
  monitor: InkMonitor;
  onComplete: () => void;
}

export class InkMonitor {
  private agents: Map<string, AgentData> = new Map();
  private isRunning = false;
  private workspaceDirs: string[] = [];
  private uiInstance?: any;
  private listeners = new Set<() => void>();
  private initialInfo: InitialInfo;

  constructor(initialInfo: InitialInfo) {
    this.initialInfo = initialInfo;
    this.setupSignalHandlers();
  }

  // Subscribe to changes - proper React pattern
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private triggerUpdate() {
    this.listeners.forEach(listener => listener());
  }

  // Getters for React component
  getAgents() {
    return this.agents;
  }

  getWorkspaceDirs() {
    return this.workspaceDirs;
  }

  getInitialInfo() {
    return this.initialInfo;
  }

  start() {
    this.isRunning = true;

    // Force Ink to work by ensuring proper terminal detection
    const { exit } = process;
    process.stdout.isTTY = true;
    process.stderr.isTTY = true;

    const uiInstance = render(
      <BenchmarkMonitor
        monitor={this}
        onComplete={() => {
          this.stop();
        }}
      />,
      {
        // Enable Ink's full-screen mode with proper terminal control
        debug: false,
        patchConsole: true, // Let Ink control console output
        exitOnCtrlC: false // We'll handle CtrlC ourselves
      }
    );

    this.uiInstance = uiInstance;
  }

  setWorkspaceDirs(dirs: string[]) {
    this.workspaceDirs = dirs;
  }

  addAgent(name: string) {
    this.agents.set(name, {
      status: 'idle',
      output: [],
      startTime: undefined
    });
  }

  updateAgentStatus(name: string, status: AgentData['status']) {
    const agent = this.agents.get(name);
    if (agent) {
      agent.status = status;
      if (status === 'running' && !agent.startTime) {
        agent.startTime = Date.now();
      } else if (status === 'completed' || status === 'error') {
        agent.endTime = Date.now();
      }
      // Trigger UI update through subscriber pattern
      this.triggerUpdate();
    }
  }

  setAgentPid(name: string, pid: number) {
    const agent = this.agents.get(name);
    if (agent) {
      agent.pid = pid;
      this.triggerUpdate();
    }
  }

  addAgentOutput(name: string, output: string) {
    const agent = this.agents.get(name);
    if (agent) {
      // Remove ANSI escape sequences that interfere with Ink
      const cleanedOutput = output.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
      const lines = cleanedOutput.split('\n').filter(line => line.trim());
      agent.output = [...agent.output.slice(-20), ...lines]; // Keep last 20 lines
      // Trigger UI update through subscriber pattern
      this.triggerUpdate();
    }
  }

  stop() {
    this.isRunning = false;
    if (this.uiInstance) {
      this.uiInstance.unmount();
      this.uiInstance = undefined;
    }
  }

  private setupSignalHandlers() {
    const shutdown = async (signal: string) => {
      if (!this.isRunning) return;

      this.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));
  }
}

// React Ink component for efficient real-time monitoring
const BenchmarkMonitor: React.FC<InkMonitorProps> = ({ monitor, onComplete }) => {
  const { exit } = useApp();

  // Subscribe to monitor changes using proper React state
  const [updateTrigger, setUpdateTrigger] = React.useState(0);
  const [flashState, setFlashState] = React.useState(true);

  React.useEffect(() => {
    // Subscribe to the monitor's change notifications
    const unsubscribe = monitor.subscribe(() => {
      setUpdateTrigger(prev => prev + 1);
    });

    return unsubscribe;
  }, [monitor]);

  // Flashing effect for running status + force frequent updates for real-time output
  React.useEffect(() => {
    const interval = setInterval(() => {
      setFlashState(prev => !prev);
      setUpdateTrigger(prev => prev + 1); // Force update every 800ms to refresh output display
    }, 800); // Flash every 800ms for slow flashing

    return () => clearInterval(interval);
  }, []);

  // Auto-exit when all agents complete
  React.useEffect(() => {
    const agents = monitor.getAgents();
    const allCompleted = Array.from(agents.values()).every(
      agent => agent.status === 'completed' || agent.status === 'error'
    );

    if (allCompleted && agents.size > 0) {
      onComplete();
      exit();
    }
  }, [monitor, onComplete, exit]);

  const status = React.useMemo(() => {
    const agents = monitor.getAgents();
    return Array.from(agents.entries()).map(([name, agent]) => {
      let runtime = 0;
      if (agent.startTime) {
        if (agent.endTime) {
          runtime = Math.floor((agent.endTime - agent.startTime) / 1000);
        } else if (agent.status === 'running') {
          // Don't calculate runtime dynamically - store it in the agent data
          runtime = agent.startTime ? Math.floor((Date.now() - agent.startTime) / 1000) : 0;
        }
      }

      // Determine status display with flashing green dot for running
      let statusDisplay = '';
      let statusColor = '';

      if (agent.status === 'running') {
        statusDisplay = flashState ? '●' : ' ';
        statusColor = 'green';
      } else if (agent.status === 'completed') {
        statusDisplay = '✓';
        statusColor = 'green';
      } else if (agent.status === 'error') {
        statusDisplay = '✗';
        statusColor = 'red';
      } else {
        statusDisplay = '◯';
        statusColor = 'gray';
      }

      // Show actual runtime for agents
      let runtimeText = '';
      if (agent.startTime && agent.status === 'running') {
        runtimeText = `${runtime}s`;
      } else if (agent.startTime) {
        runtimeText = `${runtime}s`;
      }

      // Get last output lines (show up to 5 most recent lines)
      let lastOutputLines: string[] = [];
      if (agent.output.length > 0) {
        // Get the last 5 lines - simpler filtering to ensure real-time output shows
        const recentLines = agent.output.slice(-5);
        lastOutputLines = recentLines
          .filter(line => line && line.trim().length > 0)
          .map(line => {
            const cleanLine = line.trim();
            return cleanLine.length > 150 ? cleanLine.substring(0, 150) + '...' : cleanLine;
          });
      }

      // Show placeholder text only if no actual output exists
      if (lastOutputLines.length === 0) {
        if (agent.status === 'running') {
          lastOutputLines.push('(working...)');
        } else if (agent.status === 'idle') {
          lastOutputLines.push('(waiting to start...)');
        }
      }

      return {
        name,
        statusDisplay,
        statusColor,
        status: agent.status.toUpperCase(),
        runtime: runtimeText,
        lastOutput: lastOutputLines,
        pid: agent.pid
      };
    });
  }, [monitor, updateTrigger, flashState]);

  const workspaceDirs = monitor.getWorkspaceDirs();
  const initialInfo = monitor.getInitialInfo();

  // Create a mapping from agent name to workspace directory
  const agentWorkspaceMap = new Map<string, string>();
  workspaceDirs.forEach(dir => {
    const agentName = path.basename(dir);
    agentWorkspaceMap.set(agentName, dir);
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* Initial Information Section */}
      <Box marginBottom={1} flexDirection="column">
        <Text bold>Agent Benchmark Monitor</Text>
        {initialInfo && initialInfo.initialInfo && (
          <>
            <Text color="gray">Output: {initialInfo.initialInfo.outputDir}</Text>
            <Text color="gray">Task: {initialInfo.initialInfo.taskFile ? path.basename(initialInfo.initialInfo.taskFile) : 'Unknown'}</Text>
            <Text color="gray">Agents: {initialInfo.initialInfo.agentCount}</Text>
            <Text color="gray">Concurrency: {initialInfo.initialInfo.concurrency}, Delay: {initialInfo.initialInfo.delay}s</Text>
          </>
        )}
        {(!initialInfo || !initialInfo.initialInfo) && (
          <Text color="gray">Initializing benchmark...</Text>
        )}
      </Box>

      <Box flexDirection="column">
        {status.map((agent) => (
          <Box key={agent.name} marginBottom={1} flexDirection="column">
            <Box>
              <Text bold>
                <Text color={agent.statusColor}>{agent.statusDisplay}</Text> {agent.name}{agent.runtime ? ` ${agent.runtime}` : ''}{agent.pid ? <Text color="gray"> (pid: {agent.pid})</Text> : ''}
              </Text>
            </Box>

            {/* Show workspace directory under each agent */}
            {agentWorkspaceMap.has(agent.name) && (
              <Box paddingLeft={2}>
                <Text color="gray">{agentWorkspaceMap.get(agent.name)}</Text>
              </Box>
            )}

            {agent.lastOutput && agent.lastOutput.length > 0 && (
              <Box paddingLeft={4} flexDirection="column" paddingBottom={1} marginTop={1}>
                {agent.lastOutput.map((line, index) => (
                  <Text key={index} color="gray">{line}</Text>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Press Ctrl+C to exit</Text>
      </Box>
    </Box>
  );
};