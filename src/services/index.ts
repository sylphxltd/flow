/**
 * Service modules barrel export
 * Centralized access to service layer functionality
 */

// Re-export commonly used service functions
export {
  configureServers,
  default as mcpService,
  installServers,
  listAvailableServers,
  validateServerConfiguration,
} from './mcp-service';
