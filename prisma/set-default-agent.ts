/**
 * Set General Assistant as default for all users
 */
/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Setting General Assistant as default...\n');

  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  for (const user of users) {
    // Unset all defaults
    await prisma.userAgent.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });

    // Set General Assistant as default
    const generalAgent = await prisma.userAgent.findUnique({
      where: {
        userId_agentId: {
          userId: user.id,
          agentId: 'agent_general_assistant',
        },
      },
    });

    if (generalAgent) {
      await prisma.userAgent.update({
        where: { id: generalAgent.id },
        data: { isDefault: true },
      });
      console.log(`✅ ${user.email}: General Assistant set as default`);
    }
  }

  console.log('\n✨ Done!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

