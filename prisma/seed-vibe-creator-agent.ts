/**
 * Seed script for the default AI assistant agent.
 *
 * This agent is the default entrypoint for user-facing chat.
 * Customize the instructions, tools, and model to fit your product.
 */
/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedVibeCreatorAgent() {
  console.log('🌱 Seeding default AI assistant agent...');

  const agent = await prisma.agent.upsert({
    where: { id: 'agent_vibe_creator' },
    update: {
      name: 'AI Assistant',
      description:
        'General-purpose AI assistant. Customize this agent with your own instructions and tools.',
      avatar: '✨',
      color: '#6366F1',
      instructions: `You are an AI assistant.

Your core mission: help users accomplish their goals effectively.

Tools you can use:
- document_tools: read, create, and manage project documents

General guidelines:
1. Understand the user's intent before taking action.
2. Use tools when concrete output is needed (documents, data, etc.).
3. Ask clarifying questions when the request is ambiguous.
4. Be concise but thorough in your responses.
5. Support both English and Chinese naturally.`,
      model: 'anthropic/claude-sonnet-4.5',
      tools: ['document_tools'],
      enabled: true,
      isSystem: true,
      updatedAt: new Date(),
    },
    create: {
      id: 'agent_vibe_creator',
      name: 'AI Assistant',
      description:
        'General-purpose AI assistant. Customize this agent with your own instructions and tools.',
      avatar: '✨',
      color: '#6366F1',
      instructions: `You are an AI assistant.

Your core mission: help users accomplish their goals effectively.

Tools you can use:
- document_tools: read, create, and manage project documents

General guidelines:
1. Understand the user's intent before taking action.
2. Use tools when concrete output is needed (documents, data, etc.).
3. Ask clarifying questions when the request is ambiguous.
4. Be concise but thorough in your responses.
5. Support both English and Chinese naturally.`,
      model: 'anthropic/claude-sonnet-4.5',
      tools: ['document_tools'],
      enabled: true,
      isSystem: true,
    },
  });

  console.log('✅ Default AI assistant agent:', agent.id);
  return agent;
}
