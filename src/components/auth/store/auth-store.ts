import { create } from 'zustand';

interface AuthStore {
  loginModalOpen: boolean;
  callbackUrl?: string;
  /**
   * 登录弹窗入口来源：
   * - header: 头部导航
   * - generate_gate: 生成按钮登录拦截
   * - credits_dialog: 积分不足弹窗
   * - url: 直接访问 /auth/signin
   */
  loginModalSource?: "header" | "generate_gate" | "credits_dialog" | "url";
  setLoginModalOpen: (
    open: boolean,
    callbackUrlOrSource?: string,
    maybeSource?: AuthStore["loginModalSource"]
  ) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  loginModalOpen: false,
  callbackUrl: undefined,
  loginModalSource: undefined,
  setLoginModalOpen: (open, callbackUrlOrSource, maybeSource) => {
    // 兼容旧调用方式：setLoginModalOpen(true) / setLoginModalOpen(true, callbackUrl)
    let callbackUrl: string | undefined;
    let source: AuthStore["loginModalSource"] | undefined;

    if (!open) {
      // 关闭时仅重置开关，保留上一次的 callback/source 供统计使用
      set({ loginModalOpen: false });
      return;
    }

    if (maybeSource) {
      callbackUrl = callbackUrlOrSource;
      source = maybeSource;
    } else if (
      callbackUrlOrSource === "header" ||
      callbackUrlOrSource === "generate_gate" ||
      callbackUrlOrSource === "credits_dialog" ||
      callbackUrlOrSource === "url"
    ) {
      source = callbackUrlOrSource;
      callbackUrl = undefined;
    } else {
      callbackUrl = callbackUrlOrSource;
      source = "header";
    }

    set({
      loginModalOpen: true,
      callbackUrl,
      loginModalSource: source,
    });
  },
}));

