// src/utils/jsonc.ts
function parseJSONC(content) {
  try {
    let cleaned = removeComments(content);
    cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(
      `Failed to parse JSONC: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
function removeComments(content) {
  let result = "";
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
    if (char === "\\" && inString) {
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
      if (char === "\n") {
        inSingleLineComment = false;
        result += char;
      }
      continue;
    }
    if (inMultiLineComment) {
      if (char === "*" && nextChar === "/") {
        inMultiLineComment = false;
        i++;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }
    if (char === "/" && nextChar === "/") {
      inSingleLineComment = true;
      i++;
      continue;
    }
    if (char === "/" && nextChar === "*") {
      inMultiLineComment = true;
      i++;
      continue;
    }
    result += char;
  }
  return result;
}
function stringifyJSONC(obj, schema, indent = 2) {
  const config = { ...obj };
  if (schema && !config.$schema) {
    config.$schema = schema;
  }
  const json = JSON.stringify(config, null, indent);
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
async function readJSONCFile(filePath) {
  const fs = await import("fs/promises");
  const content = await fs.readFile(filePath, "utf8");
  return parseJSONC(content);
}
async function writeJSONCFile(filePath, obj, schema, indent = 2) {
  const fs = await import("fs/promises");
  const content = stringifyJSONC(obj, schema, indent);
  await fs.writeFile(filePath, content, "utf8");
}
export {
  parseJSONC,
  readJSONCFile,
  stringifyJSONC,
  writeJSONCFile
};
