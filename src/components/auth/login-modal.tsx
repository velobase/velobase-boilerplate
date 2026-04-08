"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { LoginModalDesktop } from "./login-modal-desktop";
import { LoginModalMobile } from "./login-modal-mobile";

/**
 * LoginModal - 响应式入口
 * 
 * - Desktop (>= 768px): 使用 Dialog 居中弹窗
 * - Mobile (< 768px): 使用 Drawer 底部滑出
 */
export function LoginModal() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <LoginModalMobile />;
  }

  return <LoginModalDesktop />;
}
