#!/usr/bin/env node

// Test the final clean architecture
import { spawn } from 'child_process';

const testFinalArchitecture = async () => {
  console.log('Testing final clean architecture...');

  const serverProcess = spawn('node', ['dist/sylphx-flow-mcp-server-RFCHM3S6.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {},
  };

  serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  let response = '';
  serverProcess.stdout.on('data', (data) => {
    response += data.toString();
    try {
      const parsed = JSON.parse(response);
      if (parsed.result && parsed.result.tools) {
        const tools = parsed.result.tools;

        console.log(`✅ Found ${tools.length} tools:`);
        tools.forEach((tool) => {
          console.log(`  - ${tool.name}: ${tool.description}`);
        });

        // Verify all expected tools are present
        const expectedTools = [
          'memory_set',
          'memory_get',
          'memory_search',
          'memory_list',
          'memory_delete',
          'memory_clear',
          'memory_stats',
          'get_current_time',
          'convert_time',
          'project_startup',
        ];

        const missingTools = expectedTools.filter((name) => !tools.find((t) => t.name === name));
        if (missingTools.length > 0) {
          console.log(`❌ Missing tools: ${missingTools.join(', ')}`);
        } else {
          console.log('✅ All expected tools are registered!');
        }

        serverProcess.kill();
        process.exit(0);
      }
    } catch (e) {
      // Not a complete JSON response yet
    }
  });

  setTimeout(() => {
    console.log('❌ Test timed out');
    serverProcess.kill();
    process.exit(1);
  }, 5000);
};

testFinalArchitecture().catch(console.error);
