import { create } from "zustand";

interface ProjectFilterState {
  // Current project filter ID (null = show all conversations)
  projectFilterId: string | null;
  
  // Actions
  setProjectFilterId: (projectId: string | null) => void;
  clearProjectFilter: () => void;
}

export const useProjectFilterStore = create<ProjectFilterState>((set) => ({
  projectFilterId: null,
  
  setProjectFilterId: (projectId) => set({ projectFilterId: projectId }),
  
  clearProjectFilter: () => set({ projectFilterId: null }),
}));

