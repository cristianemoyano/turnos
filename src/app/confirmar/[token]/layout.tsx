export default function ConfirmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-start justify-center bg-neutral-200 px-4 py-8">
      <div className="w-full max-w-[440px] bg-bg shadow-[var(--shadow-lg)] min-h-[400px] flex flex-col">{children}</div>
    </div>
  );
}
