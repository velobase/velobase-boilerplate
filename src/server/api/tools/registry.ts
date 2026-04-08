import { createLogger } from "@/lib/logger";

const logger = createLogger("tool-registry");

/**
 * 工具上下文 - 传递给工具的上下文信息
 */
export interface ToolContext {
  projectId?: string;
  userId?: string;
  conversationId?: string;
  [key: string]: unknown;
}

/**
 * 工具工厂函数 - 根据上下文创建工具实例
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolFactory = (context?: ToolContext) => any;

/**
 * 工具配置
 */
export interface ToolConfig {
  name: string;
  description: string;
  factory: ToolFactory;
}

/**
 * 工具注册表
 */
class ToolRegistry {
  private tools = new Map<string, ToolConfig>();

  /**
   * 注册工具
   */
  register(config: ToolConfig): void {
    if (this.tools.has(config.name)) {
      logger.warn({ name: config.name }, "Overwriting existing tool");
    }
    this.tools.set(config.name, config);
    logger.info({ name: config.name }, "Registered tool");
  }

  /**
   * 获取工具工厂
   */
  get(name: string): ToolFactory | undefined {
    return this.tools.get(name)?.factory;
  }

  /**
   * 列出所有工具
   */
  list(): ToolConfig[] {
    return Array.from(this.tools.values());
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }
}

/**
 * 全局工具注册表实例
 */
export const toolRegistry = new ToolRegistry();

