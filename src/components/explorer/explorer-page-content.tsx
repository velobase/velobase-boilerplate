'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, SlidersHorizontal } from 'lucide-react';
import { AgentCard } from './agent-card';
import { AgentCardSkeleton } from './agent-card-skeleton';

interface ExplorerPageContentProps {
  isGuest: boolean;
}

export function ExplorerPageContent({ isGuest }: ExplorerPageContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInstalledOnly, setShowInstalledOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'name'>('popular');

  // Fetch all system agents
  const { data: systemAgents = [], isLoading: isLoadingAgents } = api.agent.listSystem.useQuery();

  // Fetch user's installed agents (only if logged in)
  const { data: userAgents = [], isLoading: isLoadingUserAgents } = api.userAgent.listWithDetails.useQuery(
    undefined,
    { enabled: !isGuest }
  );

  const installedAgentIds = new Set(userAgents.map(ua => ua.agentId));

  // Filter agents
  const filteredAgents = systemAgents
    .filter(agent => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          agent.name.toLowerCase().includes(query) ||
          agent.description?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .filter(agent => {
      // Installed only filter
      if (showInstalledOnly) {
        return installedAgentIds.has(agent.id);
      }
      return true;
    })
    .sort((a, b) => {
      // Sort
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'popular':
        default:
          // For now, default order (could add popularity metrics later)
          return 0;
      }
    });

  const isLoading = isLoadingAgents || (!isGuest && isLoadingUserAgents);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight leading-9">Explore Agents</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-5">
          Discover and install AI agents for different tasks
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'popular' | 'newest' | 'name')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter: Installed Only */}
        {!isGuest && (
          <Button
            variant={showInstalledOnly ? 'default' : 'outline'}
            onClick={() => setShowInstalledOnly(!showInstalledOnly)}
            className="w-full sm:w-auto"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            {showInstalledOnly ? 'Showing Installed' : 'Show All'}
          </Button>
        )}
      </div>

      {/* Agent Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {showInstalledOnly
              ? 'No installed agents found. Try browsing all agents.'
              : 'No agents found. Try a different search query.'}
          </p>
          {showInstalledOnly && (
            <Button
              variant="outline"
              onClick={() => setShowInstalledOnly(false)}
              className="mt-4"
            >
              Show All Agents
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isInstalled={installedAgentIds.has(agent.id)}
              isGuest={isGuest}
              userAgent={userAgents.find(ua => ua.agentId === agent.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

