'use client';

import { Sparkles } from 'lucide-react';

interface AgentLogoProps {
  avatar?: string | null;
  name: string;
  color?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  xs: 'h-5 w-5 text-xs',
  sm: 'h-10 w-10 text-xl',
  md: 'h-12 w-12 text-2xl',
  lg: 'h-16 w-16 text-3xl',
};

const iconSizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function AgentLogo({ avatar, name, color, size = 'md' }: AgentLogoProps) {
  const isUrl = avatar?.startsWith('http://') || avatar?.startsWith('https://');
  
  // If avatar is a URL, show image
  if (isUrl && avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt={name}
        className={`${sizeClasses[size]} rounded object-cover`}
      />
    );
  }
  
  // Default: gradient background with icon
  const gradientColor = color || '#3B82F6';
  
  return (
    <div
      className={`${sizeClasses[size]} rounded flex items-center justify-center shadow-sm`}
      style={{
        background: `linear-gradient(135deg, ${gradientColor}E6, ${gradientColor}B3)`,
      }}
    >
      <Sparkles className={`${iconSizeClasses[size]} text-white`} />
    </div>
  );
}

