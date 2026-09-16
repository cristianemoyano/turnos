"use client";

type FabProps = {
  "aria-label": string;
  onClick: () => void;
};

export function Fab({ "aria-label": ariaLabel, onClick }: FabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="absolute right-4.5 bottom-22 size-13 rounded-full bg-accent text-bg flex items-center justify-center shadow-[var(--shadow-lg)] cursor-pointer z-10"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}
