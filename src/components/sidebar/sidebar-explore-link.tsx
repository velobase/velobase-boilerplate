'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import { useSidebarStore } from './store/sidebar-store';

export function SidebarExploreLink() {
  const pathname = usePathname();
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);
  const isActive = pathname === '/explorer';

  return (
    <Link
      href="/explorer"
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive && 'bg-accent text-accent-foreground',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <Sparkles className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-primary')} />
      {!isCollapsed && <span>Explore Agents</span>}
    </Link>
  );
}

