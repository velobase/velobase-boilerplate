import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserAgent, Agent } from '@prisma/client';

export type AgentWithDetails = UserAgent & {
  agent: Agent;
};

interface AgentStore {
  userAgents: AgentWithDetails[];
  selectedUserAgentId: string | null;
  setUserAgents: (agents: AgentWithDetails[]) => void;
  setSelectedUserAgentId: (id: string) => void;
  getSelectedUserAgent: () => AgentWithDetails | undefined;
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set, get) => ({
      userAgents: [],
      selectedUserAgentId: null,

      setUserAgents: (agents: AgentWithDetails[]) => {
        const { selectedUserAgentId } = get();
        // Set agents and ensure a default is selected if none is already
        set({ userAgents: agents });
        if (!selectedUserAgentId || !agents.some(a => a.id === selectedUserAgentId)) {
          const defaultAgent = agents.find(a => a.isDefault) ?? agents[0];
          if (defaultAgent) {
            set({ selectedUserAgentId: defaultAgent.id });
          }
        }
      },

      setSelectedUserAgentId: (id: string) => {
        set({ selectedUserAgentId: id });
      },
      
      getSelectedUserAgent: () => {
        const { userAgents, selectedUserAgentId } = get();
        return userAgents.find(a => a.id === selectedUserAgentId);
      },
    }),
    {
      name: 'app-global-agent-store',
      partialize: (state) => ({
        // Only persist the selected agent ID
        selectedUserAgentId: state.selectedUserAgentId,
      }),
    }
  )
);
