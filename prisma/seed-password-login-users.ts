/**
 * 密码登录测试用户种子
 * 
 * 根据 password-login-allowlist.ts 中的白名单创建测试用户
 * 审核完成后清空白名单即可关闭密码登录
 */
/* eslint-disable no-console */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PASSWORD_LOGIN_ALLOWLIST } from '../src/server/auth/password-login-allowlist';

const prisma = new PrismaClient();

const TEST_CREDITS = 1000;

export async function seedPasswordLoginTestUsers() {
  if (PASSWORD_LOGIN_ALLOWLIST.length === 0) {
    console.log('   ℹ️  No password login users configured, skipping');
    return;
  }

  for (const testEmail of PASSWORD_LOGIN_ALLOWLIST) {
    try {
      // 默认密码规则: 首字母大写的 local part + "2024!"
      // 例如: test@example.com -> TestPassword2024!
      const localPart = testEmail.split('@')[0] ?? 'Test';
      const defaultPassword = localPart.charAt(0).toUpperCase() + localPart.slice(1) + '2024!';
      const passwordHash = await bcrypt.hash(defaultPassword, 12);

      const testUser = await prisma.user.upsert({
        where: { email: testEmail },
        update: { passwordHash, isBlocked: false },
        create: {
          email: testEmail,
          name: `${localPart.charAt(0).toUpperCase() + localPart.slice(1)} Test`,
          passwordHash,
          emailVerified: new Date(),
          isAdmin: false,
          isBlocked: false,
        },
      });

      // 发放测试积分（如果没有）
      const existingAccount = await prisma.billingAccount.findFirst({
        where: { userId: testUser.id, accountType: 'CREDIT' },
      });

      if (!existingAccount) {
        await prisma.billingAccount.create({
          data: {
            userId: testUser.id,
            accountType: 'CREDIT',
            subAccountType: 'FIRST_LOGIN',
            totalAmount: TEST_CREDITS,
            outerBizId: `test_grant_${testUser.id}`,
          },
        });
      }

      console.log(`   ✅ ${testEmail} (password: ${defaultPassword})`);
    } catch (error) {
      console.warn(`   ⚠️ Failed to seed ${testEmail}:`, error);
    }
  }
}

