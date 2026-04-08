/**
 * 密码登录白名单
 * 只有这些邮箱可以用密码登录，其他走 magic link / Google
 * 审核完成后清空此列表即可关闭密码登录
 */
export const PASSWORD_LOGIN_ALLOWLIST: string[] = [
  "testadmin@example.com",
  // 可以加更多测试邮箱
];

export function isPasswordLoginAllowed(email: string): boolean {
  const normalized = email.toLowerCase().trim();
  return PASSWORD_LOGIN_ALLOWLIST.includes(normalized);
}

