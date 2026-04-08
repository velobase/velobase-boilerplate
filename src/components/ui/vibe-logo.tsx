import { cn } from "@/lib/utils";
import { Logo } from "./logo";

interface VibeLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "minimal";
}

const logoSizeMap = {
  sm: "sm" as const,
  md: "sm" as const,
  lg: "md" as const,
};

const textClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

export function VibeLogo({ className, size = "md", variant = "default" }: VibeLogoProps) {
  return (
    <div className={cn("flex items-center gap-2 font-poppins group", className)}>
      <Logo size={logoSizeMap[size]} className="text-primary" />
      {variant === "default" && (
        <div className={cn("font-bold tracking-tight leading-none flex items-center", textClasses[size])}>
          <span className="text-foreground">AI</span>
          <span className="text-foreground/40 font-medium ml-1">SaaS</span>
        </div>
      )}
    </div>
  );
}
