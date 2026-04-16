// db import available when you implement actual persistence
// import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";

const logger = createLogger("example-service");

export interface CreateItemInput {
  userId: string;
  title: string;
  content?: string;
}

export interface ListItemsInput {
  userId: string;
  limit?: number;
  cursor?: string;
}

/**
 * Create a new item for the user.
 * Replace this with your actual business logic.
 */
export async function createItem(input: CreateItemInput) {
  logger.info({ userId: input.userId, title: input.title }, "Creating item");

  // Example: persist to database
  // const item = await db.yourModel.create({ data: { ... } });

  // Placeholder return
  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    title: input.title,
    content: input.content ?? "",
    createdAt: new Date(),
  };
}

/**
 * List items for a user with cursor-based pagination.
 */
export async function listItems(input: ListItemsInput) {
  logger.info({ userId: input.userId }, "Listing items");

  // Example: query database
  // const items = await db.yourModel.findMany({
  //   where: { userId: input.userId },
  //   take: input.limit ?? 20,
  //   cursor: input.cursor ? { id: input.cursor } : undefined,
  //   orderBy: { createdAt: "desc" },
  // });

  return {
    items: [],
    nextCursor: null as string | null,
  };
}
