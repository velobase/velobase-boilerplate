import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

export function Logo({ className, size = "md" }: LogoProps) {
  // Adjusted viewBox to center the F shape better
  // For small sizes, the gradient effect is more concentrated
  return (
    <svg
      width="800"
      height="800"
      viewBox="0 0 800 800"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizeMap[size], className)}
      aria-label="app logo"
    >
      {/* Pixelated F: Gradient from center outward for better visibility at small sizes */}
      {/* Top horizontal line */}
      <rect x="200" y="150" width="80" height="80" fill="currentColor" className="opacity-100 dark:opacity-40" />
      <rect x="300" y="150" width="80" height="80" fill="currentColor" className="opacity-95 dark:opacity-60" />
      <rect x="400" y="150" width="80" height="80" fill="currentColor" className="opacity-80 dark:opacity-80" />
      <rect x="500" y="150" width="80" height="80" fill="currentColor" className="opacity-60 dark:opacity-95" />
      <rect x="600" y="150" width="80" height="80" fill="currentColor" className="opacity-40 dark:opacity-100" />
      
      {/* Second row - middle horizontal line */}
      <rect x="200" y="250" width="80" height="80" fill="currentColor" className="opacity-100 dark:opacity-60" />
      <rect x="300" y="250" width="80" height="80" fill="currentColor" className="opacity-95 dark:opacity-80" />
      <rect x="400" y="250" width="80" height="80" fill="currentColor" className="opacity-80 dark:opacity-95" />
      <rect x="500" y="250" width="80" height="80" fill="currentColor" className="opacity-60 dark:opacity-100" />
      
      {/* Third row - shorter middle line */}
      <rect x="200" y="350" width="80" height="80" fill="currentColor" className="opacity-100 dark:opacity-80" />
      <rect x="300" y="350" width="80" height="80" fill="currentColor" className="opacity-90 dark:opacity-95" />
      <rect x="400" y="350" width="80" height="80" fill="currentColor" className="opacity-70 dark:opacity-100" />
      
      {/* Fourth row - vertical line */}
      <rect x="200" y="450" width="80" height="80" fill="currentColor" className="opacity-100 dark:opacity-95" />
      <rect x="300" y="450" width="80" height="80" fill="currentColor" className="opacity-80 dark:opacity-100" />
      
      {/* Fifth row - vertical line bottom */}
      <rect x="200" y="550" width="80" height="80" fill="currentColor" className="opacity-100" />
    </svg>
  );
}

// Icon version for smaller use cases
export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
      aria-label="app icon"
    >
      <rect x="0" y="0" width="32" height="32" rx="5" fill="currentColor" className="text-background" />
      {/* Simplified pixel F for small sizes */}
      <rect x="6" y="6" width="12" height="3" fill="currentColor" className="text-foreground" />
      <rect x="6" y="11" width="8" height="3" fill="currentColor" className="text-foreground" />
      <rect x="6" y="16" width="3" height="7" fill="currentColor" className="text-foreground" />
    </svg>
  );
}
