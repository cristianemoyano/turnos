export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-text">
      <h1 className="text-2xl font-semibold">Sin conexión</h1>
      <p className="max-w-sm text-neutral-600">
        No hay red en este momento. Revisá tu conexión e intentá de nuevo.
      </p>
    </main>
  );
}
