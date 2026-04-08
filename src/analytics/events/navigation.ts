/**
 * 应用导航埋点
 */

export const NAVIGATION_EVENTS = {
  // 移动端底部导航
  MOBILE_TAB_CLICK: "nav_mobile_tab_click",
  MOBILE_TAB_LEAVE: "nav_mobile_tab_leave",
} as const;

export type MobileTab = "create" | "chat" | "history" | "profile";

export interface NavigationEventProperties {
  [NAVIGATION_EVENTS.MOBILE_TAB_CLICK]: {
    tab: MobileTab;
    from_tab: MobileTab | null;
  };

  [NAVIGATION_EVENTS.MOBILE_TAB_LEAVE]: {
    tab: MobileTab;
    duration_seconds: number;
  };
}

