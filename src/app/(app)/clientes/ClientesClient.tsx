"use client";

import { useEffect, useState } from "react";
import { Fab } from "@/components/layout/Fab";
import { Input } from "@/components/primitives/Input";
import { Badge } from "@/components/primitives/Badge";
import { ClientSheet } from "./ClientSheet";
import { NewClientSheet } from "./NewClientSheet";

type ApiClient = {
  id: string;
  name: string;
  phone: string | null;
  visits: number;
  lastVisit: string | null;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export default function ClientesClient() {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = search ? `?q=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/v1/clients${params}`);
      const json = await res.json();
      if (cancelled) return;
      setClients(json.data ?? []);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [search, refresh]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden relative">
      <div className="flex-none px-5 pt-4.5 pb-3 border-b-2 border-divider flex flex-col gap-2.5">
        <h2 className="text-2xl">Clientes</h2>
        <Input placeholder="Buscar por nombre" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="flex-1 overflow-auto pb-16">
        {!loading && clients.length === 0 && (
          <p className="p-5 text-sm opacity-55">
            {search.trim()
              ? "Ningún cliente coincide con la búsqueda."
              : "No hay clientes todavía. Tocá + para agregar el primero."}
          </p>
        )}
        {clients.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setOpenId(c.id)}
            className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-divider text-left cursor-pointer"
          >
            <div className="size-9.5 flex-none rounded-full bg-neutral-300 flex items-center justify-center font-heading font-extrabold text-[13px]">
              {initials(c.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{c.name}</div>
              <div className="text-xs opacity-60">
                {c.phone || "Sin teléfono"}
                {c.lastVisit && ` · última visita ${new Date(c.lastVisit).toLocaleDateString("es-AR")}`}
              </div>
            </div>
            <Badge variant="neutral">{c.visits === 1 ? "1 visita" : `${c.visits} visitas`}</Badge>
          </button>
        ))}
      </div>
      <Fab aria-label="Nuevo cliente" onClick={() => setNewOpen(true)} />
      <NewClientSheet open={newOpen} onOpenChange={setNewOpen} onCreated={() => setRefresh((r) => r + 1)} />
      <ClientSheet
        clientId={openId}
        open={!!openId}
        onOpenChange={(open) => !open && setOpenId(null)}
        onSaved={() => setRefresh((r) => r + 1)}
        onDeleted={() => setRefresh((r) => r + 1)}
      />
    </div>
  );
}
