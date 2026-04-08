"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  isCollapsed: boolean;
  isHovered: boolean;
  setIsHovered: (isHovered: boolean) => void;
  toggleCollapse: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isHovered: false,
      setIsHovered: (isHovered) => set({ isHovered }),
      toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
    }),
    {
      name: 'app-sidebar-storage',
    }
  )
);
