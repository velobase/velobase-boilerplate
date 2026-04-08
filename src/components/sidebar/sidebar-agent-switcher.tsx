"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AgentLogo } from "@/components/explorer/agent-logo";
import { useSidebarStore } from "./store/sidebar-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Import types directly from Prisma
import type { UserAgent, Agent } from '@prisma/client';

// Type for user agents with full agent details
type AgentWithDetails = UserAgent & {
  agent: Agent;
};

interface SidebarAgentSwitcherProps {
  agents: AgentWithDetails[];
  selectedAgentId: string | null;
  onAgentChange: (agentId: string) => void;
}

export function SidebarAgentSwitcher({
  agents,
  selectedAgentId,
  onAgentChange,
}: SidebarAgentSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  // Collapsed state: icon button with tooltip
  if (isCollapsed) {
    return (
      <div className="px-2 pb-2">
        <TooltipProvider>
          <Tooltip>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-lg"
                    aria-label="Switch Agent"
                  >
                    <AgentLogo
                      avatar={selectedAgent?.agent.avatar}
                      name={selectedAgent?.agent.name ?? "Select Agent"}
                      color={selectedAgent?.agent.color}
                      size="xs"
                    />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{selectedAgent?.agent.name ?? "Select Agent"}</p>
              </TooltipContent>
              <AgentSelectorPopover
                agents={agents}
                selectedAgentId={selectedAgentId}
                onAgentChange={onAgentChange}
                onClose={() => setIsOpen(false)}
              />
            </Popover>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // Expanded state: list item style
  return (
    <div className="px-3 pb-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="w-full h-10 justify-between px-3 rounded-lg hover:bg-muted/70 transition-colors font-normal"
            aria-haspopup="listbox"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AgentLogo
                avatar={selectedAgent?.agent.avatar}
                name={selectedAgent?.agent.name ?? "Select Agent"}
                color={selectedAgent?.agent.color}
                size="xs"
              />
              <span className="truncate text-sm">
                {selectedAgent?.agent.name ?? "Select Agent"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <AgentSelectorPopover
          agents={agents}
          selectedAgentId={selectedAgentId}
          onAgentChange={onAgentChange}
          onClose={() => setIsOpen(false)}
        />
      </Popover>
    </div>
  );
}

// Popover component for agent selection
function AgentSelectorPopover({ 
  agents, 
  selectedAgentId,
  onAgentChange,
  onClose
}: { 
  agents: AgentWithDetails[];
  selectedAgentId: string | null;
  onAgentChange: (agentId: string) => void;
  onClose: () => void;
}) {
  return (
    <PopoverContent className="w-[280px] p-0" align="start">
      <Command>
        <CommandInput placeholder="Search agents..." className="h-9" />
        <CommandList>
          <CommandEmpty>No agents found</CommandEmpty>
          <CommandGroup>
            {agents.map((agent) => {
              const isSelected = agent.id === selectedAgentId;
              const isDefault = agent.isDefault;
              
              return (
                <CommandItem
                  key={agent.id}
                  value={agent.agent.name}
                  onSelect={() => {
                    onAgentChange(agent.id);
                    onClose();
                  }}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <AgentLogo
                      avatar={agent.agent.avatar}
                      name={agent.agent.name}
                      color={agent.agent.color}
                      size="sm"
                    />
                    <span className="truncate text-sm">{agent.agent.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isDefault && (
                      <span className="text-xs text-muted-foreground">Default</span>
                    )}
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
      <div className="border-t px-2 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sm h-8"
          onClick={() => {
            onClose();
            window.location.href = '/explorer';
          }}
        >
          Browse more agents...
        </Button>
      </div>
    </PopoverContent>
  );
}
