import { defaultLocale, locales, type Locale } from "./config";

/**
 * 纯客户端函数：读取 NEXT_LOCALE Cookie 获取当前语言。
 * 用于 LocaleSwitcher 高亮当前选中语言。
 * 无法获取时回退 defaultLocale（与 Accept-Language 协商无关）。
 */
export function getLocaleFromCookie(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("NEXT_LOCALE="));
  const value = match?.split("=")[1];
  if (value && (locales as readonly string[]).includes(value)) {
    return value as Locale;
  }
  return defaultLocale;
}
