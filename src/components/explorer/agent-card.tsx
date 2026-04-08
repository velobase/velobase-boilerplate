'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, MessageSquare, Check, Star } from 'lucide-react';
import { useAuthStore } from '@/components/auth/store/auth-store';
import { AgentLogo } from './agent-logo';
import type { Agent, UserAgent } from '@prisma/client';

interface AgentCardProps {
  agent: Agent;
  isInstalled: boolean;
  isGuest: boolean;
  userAgent?: UserAgent & { agent: Agent };
}

export function AgentCard({ agent, isInstalled, isGuest, userAgent }: AgentCardProps) {
  const router = useRouter();
  const { setLoginModalOpen } = useAuthStore();
  const utils = api.useUtils();

  const [isInstalling, setIsInstalling] = useState(false);

  // Install mutation
  const installMutation = api.userAgent.install.useMutation({
    onSuccess: () => {
      void utils.userAgent.listWithDetails.invalidate();
      toast.success(`${agent.name} installed`);
      setIsInstalling(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to install agent');
      setIsInstalling(false);
    },
  });

  // Uninstall mutation
  const uninstallMutation = api.userAgent.uninstall.useMutation({
    onSuccess: () => {
      void utils.userAgent.listWithDetails.invalidate();
      toast.success(`${agent.name} uninstalled`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to uninstall agent');
    },
  });

  // Set as default mutation
  const setDefaultMutation = api.userAgent.setDefault.useMutation({
    onSuccess: () => {
      void utils.userAgent.listWithDetails.invalidate();
      toast.success(`${agent.name} set as default`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to set as default');
    },
  });

  const handleStartChat = () => {
    if (isGuest) {
      // Guest can start chat directly
      router.push(`/chat?agent=${agent.id}`);
    } else {
      router.push(`/chat?agent=${agent.id}`);
    }
  };

  const handleInstall = () => {
    if (isGuest) {
      setLoginModalOpen(true, '/explorer');
      return;
    }

    setIsInstalling(true);
    installMutation.mutate({ agentId: agent.id, setAsDefault: false });
  };

  const handleUninstall = () => {
    if (!userAgent) return;
    uninstallMutation.mutate({ id: userAgent.id });
  };

  const handleSetDefault = () => {
    if (!userAgent) return;
    setDefaultMutation.mutate({ id: userAgent.id });
  };

  const isDefault = userAgent?.isDefault ?? false;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <AgentLogo
              avatar={agent.avatar}
              name={agent.name}
              color={agent.color}
              size="md"
            />
            
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg leading-6">{agent.name}</CardTitle>
              {agent.isSystem && (
                <Badge className="mt-1 text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/20">
                  Official
                </Badge>
              )}
            </div>
          </div>

          {/* More menu */}
          {isInstalled && !isGuest && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isDefault && (
                  <DropdownMenuItem onClick={handleSetDefault}>
                    <Star className="h-4 w-4 mr-2" />
                    Set as Default
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={handleUninstall}
                  className="text-destructive"
                >
                  Uninstall
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <CardDescription className="line-clamp-2 text-sm leading-relaxed">
          {agent.description || 'No description available'}
        </CardDescription>
      </CardContent>

      <CardFooter className="flex gap-2 pt-4">
        {/* Primary: Start Chat */}
        <Button
          onClick={handleStartChat}
          className="flex-1"
          size="sm"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Start Chat
        </Button>

        {/* Secondary: Install/Installed */}
        {isInstalled ? (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            {isDefault ? 'Default' : 'Installed'}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleInstall}
            disabled={isInstalling}
          >
            {isGuest ? 'Login to Install' : isInstalling ? 'Installing...' : 'Install'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

