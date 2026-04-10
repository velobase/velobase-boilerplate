/**
 * OAuth Provider 注册表（服务端）
 *
 * 增删 OAuth 登录方式：
 * 1. 在此文件的 oauthProviders 中添加/删除 NextAuth Provider
 * 2. 在 src/components/auth/oauth-providers.tsx 中添加/删除对应的 UI 配置
 * 3. 在 src/env.js 中添加/删除对应的环境变量
 * 4. 在 .env 中填入密钥
 */
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import type { Provider } from "next-auth/providers";

export const oauthProviders: Provider[] = [
  GoogleProvider,
  GitHubProvider({
    // GitHub adds `iss` param to OAuth callback (RFC 9207). The underlying
    // oauth4webapi library always validates `iss` when present, comparing it
    // against AuthorizationServer.issuer. Auth.js defaults this to
    // "https://authjs.dev" for non-OIDC providers, which mismatches GitHub's
    // actual value. Setting issuer here fixes the validation.
    issuer: "https://github.com/login/oauth",
  }),
];

const oauthProviderIds = new Set(["google", "github"]);

export function isOAuthProvider(providerId: string): boolean {
  return oauthProviderIds.has(providerId);
}
