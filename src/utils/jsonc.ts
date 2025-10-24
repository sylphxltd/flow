/**
 * JSONC (JSON with Comments) utilities
 * Provides functions to parse and stringify JSONC files while preserving comments
 */

/**
 * Parse JSONC content (JSON with Comments)
 * @param content - The JSONC string to parse
 * @returns The parsed JavaScript object
 */
export function parseJSONC(content: string): unknown {
  try {
    // Remove single-line comments (//) but not inside strings
    let cleaned = removeComments(content);

    // Remove trailing commas before closing brackets/braces
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(
      `Failed to parse JSONC: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Remove comments from JSON content while preserving strings
 */
function removeComments(content: string): string {
  let result = '';
  let inString = false;
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  let escapeNext = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      result += char;
      escapeNext = true;
      continue;
    }

    if (inString) {
      if (char === '"') {
        inString = false;
      }
      result += char;
      continue;
    }

    if (inSingleLineComment) {
      if (char === '\n') {
        inSingleLineComment = false;
        result += char;
      }
      continue;
    }

    if (inMultiLineComment) {
      if (char === '*' && nextChar === '/') {
        inMultiLineComment = false;
        i++; // Skip the '/'
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === '/' && nextChar === '/') {
      inSingleLineComment = true;
      i++; // Skip the second '/'
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inMultiLineComment = true;
      i++; // Skip the '*'
      continue;
    }

    result += char;
  }

  return result;
}

/**
 * Stringify an object to JSON format with optional schema
 * @param obj - The object to stringify
 * @param schema - Optional schema URL to include
 * @param indent - Indentation spaces (default: 2)
 * @returns The formatted JSON string
 */
export function stringifyJSONC(obj: Record<string, unknown>, schema?: string, indent = 2): string {
  const config = { ...obj };

  // Add schema if provided and not already present
  if (schema && !config.$schema) {
    config.$schema = schema;
  }

  const json = JSON.stringify(config, null, indent);

  // Add helpful comments for MCP configuration
  if (config.mcp && Object.keys(config.mcp).length > 0) {
    return json.replace(
      /(\s*)"mcp": {/,
      `$1// MCP (Model Context Protocol) server configuration
$1// See https://modelcontextprotocol.io for more information
$1"mcp": {`
    );
  }

  return json;
}

/**
 * Read and parse a JSONC file
 * @param filePath - Path to the JSONC file
 * @returns The parsed object
 */
export async function readJSONCFile(filePath: string): Promise<any> {
  const fs = await import('node:fs/promises');
  const content = await fs.readFile(filePath, 'utf8');
  return parseJSONC(content);
}

/**
 * Write an object to a JSONC file
 * @param filePath - Path to the JSONC file
 * @param obj - The object to write
 * @param schema - Optional schema URL
 * @param indent - Indentation spaces
 */
export async function writeJSONCFile(
  filePath: string,
  obj: Record<string, unknown>,
  schema?: string,
  indent = 2
): Promise<void> {
  const fs = await import('node:fs/promises');
  const content = stringifyJSONC(obj, schema, indent);
  await fs.writeFile(filePath, content, 'utf8');
}
