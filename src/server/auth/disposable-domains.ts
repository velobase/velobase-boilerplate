/**
 * 临时邮箱域名黑名单检查
 * 
 * 数据来源: https://github.com/disposable/disposable-email-domains
 * 本地文件: disposable-domains.txt (72000+ 域名)
 * 
 * 更新方式: pnpm run update:disposable-domains
 */

import { readFileSync } from "fs";
import { join } from "path";

// 读取本地域名列表（从 public/data 目录）
const domainsFilePath = join(process.cwd(), "public/data/disposable-domains.txt");
const domainsContent = readFileSync(domainsFilePath, "utf-8");
const disposableDomains = new Set(
  domainsContent
    .split("\n")
    .map(d => d.trim().toLowerCase())
    .filter(d => d.length > 0)
);

/**
 * 额外的黑名单域名（本地扩展）
 */
const EXTRA_BLOCKED_DOMAINS: string[] = [
  // 添加社区列表可能遗漏的域名
];

/**
 * 白名单域名（覆盖黑名单）
 */
const ALLOWED_DOMAINS: string[] = [
  // 某些域名可能被误判
];

// 合并本地扩展
for (const domain of EXTRA_BLOCKED_DOMAINS) {
  disposableDomains.add(domain.toLowerCase());
}

const allowedDomainsSet = new Set(
  ALLOWED_DOMAINS.map(d => d.toLowerCase())
);

/**
 * 检查邮箱是否为临时/一次性邮箱
 * 
 * @param email - 完整邮箱地址
 * @returns true 如果是临时邮箱
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().trim().split("@")[1];
  
  if (!domain) {
    return false;
  }

  // 白名单优先
  if (allowedDomainsSet.has(domain)) {
    return false;
  }

  return disposableDomains.has(domain);
}

/**
 * 获取邮箱域名
 */
export function getEmailDomain(email: string): string {
  return email.toLowerCase().trim().split("@")[1] ?? "";
}

/**
 * 获取黑名单域名数量（用于调试）
 */
export function getDisposableDomainsCount(): number {
  return disposableDomains.size;
}

// ============================================================================
// 著名邮箱白名单（用于注册积分判断）
// ============================================================================

/**
 * 著名邮箱域名白名单
 * 只有在这些域名注册的用户才能获得 600 积分
 */
const FAMOUS_EMAIL_DOMAINS = new Set([
  // Google
  "gmail.com",
  "googlemail.com",
  
  // Microsoft
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "hotmail.co.uk",
  "hotmail.fr",
  "outlook.co.uk",
  "outlook.fr",
  "outlook.de",
  "outlook.jp",
  
  // Yahoo
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.jp",
  "yahoo.fr",
  "yahoo.de",
  "yahoo.com.br",
  "yahoo.com.mx",
  "yahoo.ca",
  "yahoo.com.au",
  "ymail.com",
  "rocketmail.com",
  
  // Apple
  "icloud.com",
  "me.com",
  "mac.com",
  
  // Other major providers
  "aol.com",
  "zoho.com",
  "mail.com",
  "gmx.com",
  "gmx.net",
  "gmx.de",
  "web.de",
  "t-online.de",
  "yandex.com",
  "yandex.ru",
  "mail.ru",
  "qq.com",
  "163.com",
  "126.com",
  "sina.com",
  "sina.cn",
  "foxmail.com",
  "naver.com",
  "daum.net",
  "hanmail.net",
  
  // Regional/ISP emails
  "att.net",
  "verizon.net",
  "comcast.net",
  "sbcglobal.net",
  "bellsouth.net",
  "cox.net",
  "charter.net",
  "earthlink.net",
  "btinternet.com",
  "virgin.net",
  "virginmedia.com",
  "sky.com",
  "orange.fr",
  "free.fr",
  "laposte.net",
  "sfr.fr",
  "wanadoo.fr",
  "libero.it",
  "virgilio.it",
  "alice.it",
  "tin.it",
  "fastwebnet.it",
  "tiscali.it",
  "tiscali.co.uk",
]);

/**
 * 检查邮箱是否在著名邮箱白名单中
 * 
 * @param email - 完整邮箱地址
 * @returns true 如果是著名邮箱域名
 */
export function isFamousEmailDomain(email: string): boolean {
  const domain = email.toLowerCase().trim().split("@")[1];
  
  if (!domain) {
    return false;
  }

  return FAMOUS_EMAIL_DOMAINS.has(domain);
}

/**
 * 获取著名邮箱域名数量（用于调试）
 */
export function getFamousEmailDomainsCount(): number {
  return FAMOUS_EMAIL_DOMAINS.size;
}
