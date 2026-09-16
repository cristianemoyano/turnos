"use client";

import { useEffect, useState } from "react";
import { Fab } from "@/components/layout/Fab";
import { Button } from "@/components/primitives/Button";
import { Badge } from "@/components/primitives/Badge";
import { money } from "@/lib/format";
import { NewServiceSheet } from "./NewServiceSheet";
import { EditServiceSheet } from "./EditServiceSheet";
import { SegmentsSheet } from "./SegmentsSheet";

type ApiService = {
  id: string;
  name: string;
  duration_minutes: number;
  price: string;
  deposit_amount: string | null;
  active: boolean;
  segments?: { id: string; type: "work" | "wait"; duration_minutes: number }[];
};

export default function ServiciosClient() {
  const [services, setServices] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [newOpen, setNewOpen] = useState(false);
  const [segmentsFor, setSegmentsFor] = useState<ApiService | null>(null);
  const [editing, setEditing] = useState<ApiService | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await fetch("/api/v1/services");
      const json = await res.json();
      if (cancelled) return;
      setServices(json.data ?? []);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function toggleActive(service: ApiService) {
    await fetch(`/api/v1/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !service.active }),
    });
    setRefresh((r) => r + 1);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden relative">
      <div className="flex-none px-5 pt-4.5 pb-3 border-b-2 border-divider">
        <h2 className="text-2xl">Servicios</h2>
      </div>
      <div className="flex-1 overflow-auto pb-16">
        {!loading && services.length === 0 && (
          <p className="p-5 text-sm opacity-55">No hay servicios todavía. Tocá + para agregar el primero.</p>
        )}
        {services.map((s) => {
          const segmentCount = s.segments?.length ?? 0;
          return (
            <div key={s.id} className="flex items-center gap-2 px-5 py-3.5 border-b border-divider flex-wrap">
              <div className="flex-1 min-w-[140px]">
                <div className="font-semibold text-sm">{s.name}</div>
                <div className="text-xs opacity-60">
                  {segmentCount > 0
                    ? `${s.duration_minutes} min según etapas · ${segmentCount} ${segmentCount === 1 ? "etapa" : "etapas"}`
                    : `${s.duration_minutes} min`}
                  {` · ${money(s.price)}`}
                  {s.deposit_amount && ` · Seña ${money(s.deposit_amount)}`}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
                Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSegmentsFor(s)}>
                Etapas
              </Button>
              <button type="button" onClick={() => toggleActive(s)} className="cursor-pointer">
                <Badge variant={s.active ? "accent" : "neutral"}>{s.active ? "Activo" : "Inactivo"}</Badge>
              </button>
            </div>
          );
        })}
      </div>
      <Fab aria-label="Nuevo servicio" onClick={() => setNewOpen(true)} />
      <NewServiceSheet open={newOpen} onOpenChange={setNewOpen} onCreated={() => setRefresh((r) => r + 1)} />
      <EditServiceSheet
        service={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={() => setRefresh((r) => r + 1)}
        onDeleted={() => setRefresh((r) => r + 1)}
      />
      <SegmentsSheet
        serviceId={segmentsFor?.id ?? null}
        serviceName={segmentsFor?.name ?? ""}
        serviceDuration={segmentsFor?.duration_minutes ?? 30}
        open={!!segmentsFor}
        onOpenChange={(open) => !open && setSegmentsFor(null)}
        onSaved={() => setRefresh((r) => r + 1)}
      />
    </div>
  );
}
