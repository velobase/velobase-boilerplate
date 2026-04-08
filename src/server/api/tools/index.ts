import { toolRegistry } from "./registry";
import { createDocumentTools } from "./document-tools";

/**
 * 注册所有内置工具
 */

// 文档工具集
toolRegistry.register({
  name: "document_tools",
  description: "项目文档操作工具集（列出、读取、创建/更新文档）",
  factory: createDocumentTools,
});

// 导出注册表和工具
export { toolRegistry } from "./registry";
export { createDocumentTools } from "./document-tools";
export type { ToolContext, ToolConfig, ToolFactory } from "./registry";
