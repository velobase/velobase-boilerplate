export function Background() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Subtle noise texture - dark mode only */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-0 dark:opacity-[0.15]" />
    </div>
  );
}

