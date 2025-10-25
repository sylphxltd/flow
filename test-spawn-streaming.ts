import { spawn } from 'child_process';

interface SpawnConfig {
  name: string;
  command: string;
  args: string[];
  options: any;
}

class SpawnStreamingTest {
  async testShWrapperSpawn(): Promise<void> {
    console.log("=== Test: Sh Wrapper + Spawn ===");
    console.log("Command: sh -c 'claude -p \"task\"'");
    console.log("Using shell wrapper to avoid Node.js spawn issues");
    console.log("---");

    const task = "First, analyze and understand this codebase structure. Show your analysis step by step. Explain the architecture and main components, but do not modify or create any files.";

    return new Promise((resolve) => {
      const startTime = Date.now();

      // Use sh wrapper to launch claude
      const claudeProcess = spawn('claude', ['-p', '--output-format', 'stream-json',  '--verbose', '--dangerously-skip-permissions', task], {
        stdio: ['inherit', 'pipe', 'pipe'],
        env: {
          ...process.env,
        }
      });

      console.log(`PID: ${claudeProcess.pid}`);

      let stdoutCount = 0;
      let stderrCount = 0;
      let firstOutputTime: number | null = null;
      let allOutput = '';

      // Handle stdout
      claudeProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        stdoutCount++;
        allOutput += output;

        if (!firstOutputTime) {
          firstOutputTime = Date.now() - startTime;
        }

        console.log(`[STDOUT ${stdoutCount}] (${firstOutputTime}ms): ${output.trim().substring(0, 100)}${output.length > 100 ? '...' : ''}`);
      });

      // Handle stderr
      claudeProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        stderrCount++;
        console.log(`[STDERR ${stderrCount}]: ${output.trim()}`);
      });

      // Handle process close
      claudeProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        console.log("---");
        console.log(`Exit code: ${code}`);
        console.log(`Duration: ${duration}ms`);
        console.log(`STDOUT chunks: ${stdoutCount}`);
        console.log(`STDERR chunks: ${stderrCount}`);
        console.log(`First output: ${firstOutputTime}ms`);

        // Analyze output pattern
        if (stdoutCount === 0) {
          console.log("❌ No stdout output captured");
        } else if (stdoutCount === 1 && firstOutputTime && firstOutputTime > duration * 0.8) {
          console.log("🚨 Output appears BUFFERED (all at once)");
        } else if (stdoutCount > 1 || (firstOutputTime && firstOutputTime < 3000)) {
          console.log("✅ Output appears STREAMING (real-time)");
        } else {
          console.log("❓ Output pattern unclear");
        }

        console.log(`Total output length: ${allOutput.length} chars`);
        resolve();
      });

      // Handle process error
      claudeProcess.on('error', (error) => {
        console.log(`❌ Process error: ${error.message}`);
        resolve();
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!claudeProcess.killed) {
          claudeProcess.kill('SIGTERM');
          console.log("⏰ Process terminated due to timeout");
          resolve();
        }
      }, 30000);
    });
  }

  async runTest(): Promise<void> {
    console.log("🚀 Claude CLI Sh Wrapper Test");
    console.log("=".repeat(50));
    console.log("Testing sh wrapper spawn for claude -p");
    console.log("");

    await this.testShWrapperSpawn();

    console.log("\n📊 Test complete!");
    console.log("Check if sh wrapper can avoid Node.js spawn issues");
  }
}

// Run the test
const tester = new SpawnStreamingTest();
tester.runTest().catch(console.error);