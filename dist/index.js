#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Dynamic import to handle both local and npx execution
async function startCLI() {
    try {
        // Try local development path first
        const { runCLI } = await import('./src/cli.js');
        runCLI();
    }
    catch (error) {
        try {
            // Fallback for npx installation
            const cliPath = join(__dirname, 'src', 'cli.js');
            const { runCLI } = await import(cliPath);
            runCLI();
        }
        catch (fallbackError) {
            console.error('❌ Failed to load CLI module');
            console.error('Local error:', error?.message || 'Unknown error');
            console.error('Fallback error:', fallbackError?.message || 'Unknown error');
            process.exit(1);
        }
    }
}
startCLI();
