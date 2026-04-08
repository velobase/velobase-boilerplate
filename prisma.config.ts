import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';

// 手动加载 .env 文件
config();

export default defineConfig({
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});

