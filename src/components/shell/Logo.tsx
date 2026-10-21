/** Logo mark: two copper pads joined by a trace with a 45° bend. */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="7" fill="var(--ink)" />
      <path d="M9 22 L14 22 L20 12 L23 12" fill="none" stroke="var(--copper)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8" cy="22" r="3.6" fill="var(--ink)" stroke="var(--copper)" strokeWidth="2.4" />
      <circle cx="24" cy="12" r="3.6" fill="var(--copper)" />
      <circle cx="24" cy="12" r="1.3" fill="var(--ink)" />
    </svg>
  );
}
