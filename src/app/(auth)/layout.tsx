export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-200 px-4 py-10">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <h1 className="text-2xl text-center">Turnos</h1>
        {children}
      </div>
    </div>
  );
}
