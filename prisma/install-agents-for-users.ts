/**
 * Install system agents for all existing users
 * 
 * Usage:
 *   npx tsx prisma/install-agents-for-users.ts
 */
/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Installing system agents for existing users...\n');

  // Get all system agents
  const systemAgents = await prisma.agent.findMany({
    where: {
      isSystem: true,
      enabled: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`📦 Found ${systemAgents.length} system agents\n`);

  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  console.log(`👥 Found ${users.length} users\n`);

  let installedCount = 0;
  let skippedCount = 0;

  for (const user of users) {
    console.log(`\n👤 Processing user: ${user.email ?? user.name ?? user.id}`);

    for (const agent of systemAgents) {
      // Check if already installed
      const existing = await prisma.userAgent.findUnique({
        where: {
          userId_agentId: {
            userId: user.id,
            agentId: agent.id,
          },
        },
      });

      if (existing) {
        console.log(`  ⏭️  Skip: ${agent.name} (already installed)`);
        skippedCount++;
        continue;
      }

      // Install agent - first agent becomes default
      const isFirst = installedCount === 0;
      await prisma.userAgent.create({
        data: {
          userId: user.id,
          agentId: agent.id,
          isDefault: isFirst && agent.id === 'agent_general_assistant', // Set General Assistant as default
          enabled: true,
        },
      });

      console.log(`  ✅ Installed: ${agent.name}${isFirst && agent.id === 'agent_general_assistant' ? ' (default)' : ''}`);
      installedCount++;
    }
  }

  console.log('\n\n🎉 Installation complete!');
  console.log(`   ✅ Installed: ${installedCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  console.log(`   👥 Users processed: ${users.length}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

