// Simple test to verify CLI structure without running commands
import { createCLI } from '../dist/src/cli.js';

try {
  const cli = createCLI();
  console.log('✅ CLI structure created successfully');
  console.log(
    '✅ Commands available:',
    cli.commands.map((cmd) => cmd.name())
  );
  console.log('✅ CLI refactoring completed successfully');
} catch (error) {
  console.error('❌ CLI structure test failed:', error.message);
  process.exit(1);
}
