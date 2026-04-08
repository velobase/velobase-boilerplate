/**
 * MCP Server Configuration Types
 * 
 * We only support streamable_http type (not stdio)
 */

export interface MCPServerConfig {
  type: "streamable_http";
  url: string;
  env?: Record<string, string>;
}

/**
 * Type guard to check if config is valid
 */
export function isValidMcpConfig(config: unknown): config is MCPServerConfig {
  return (
    typeof config === "object" &&
    config !== null &&
    "type" in config &&
    config.type === "streamable_http" &&
    "url" in config &&
    typeof config.url === "string"
  );
}

/**
 * Parse and validate server config from Prisma Json field
 */
export function parseMcpServerConfig(config: unknown): MCPServerConfig {
  if (!isValidMcpConfig(config)) {
    throw new Error("Invalid MCP server configuration: must be streamable_http type with url");
  }
  return config;
}

/**
 * Get authorization from config env
 */
export function getAuthorizationFromConfig(config: MCPServerConfig): string | undefined {
  return config.env?.Authorization;
}

