/**
 * Service modules barrel export
 * Centralized access to service layer functionality
 */

export { default as mcpService } from './mcp-service';

// Re-export commonly used service functions
export {
  listAvailableServers,
  configureServers,
  installServers,
  validateServerConfiguration,
} from './mcp-service';
