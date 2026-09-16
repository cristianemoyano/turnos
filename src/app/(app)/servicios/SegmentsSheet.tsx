"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/primitives/Sheet";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";

type Segment = { type: "work" | "wait"; label: string; duration_minutes: number };

export function SegmentsSheet({
  serviceId,
  serviceName,
  serviceDuration,
  open,
  onOpenChange,
  onSaved,
}: {
  serviceId: string | null;
  serviceName: string;
  serviceDuration: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !serviceId) return;
    setLoaded(false);
    fetch(`/api/v1/services/${serviceId}/segments`)
      .then((res) => res.json())
      .then((json) =>
        setSegments(
          (json.data ?? []).map((s: Segment) => ({
            type: s.type,
            label: s.label,
            duration_minutes: s.duration_minutes,
          })),
        ),
      )
      .finally(() => setLoaded(true));
  }, [open, serviceId]);

  function updateSegment(idx: number, patch: Partial<Segment>) {
    setSegments((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function removeSegment(idx: number) {
    setSegments((prev) => prev.filter((_, i) => i !== idx));
  }

  function addSegment() {
    setSegments((prev) => [
      ...prev,
      {
        type: "work",
        label: "",
        duration_minutes: prev.length === 0 ? serviceDuration || 30 : 30,
      },
    ]);
  }

  async function save() {
    if (!serviceId) return;
    setSaving(true);
    try {
      await fetch(`/api/v1/services/${serviceId}/segments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments: segments.map((s) => ({
            ...s,
            label: s.label.trim() || (s.type === "wait" ? "Espera" : "Trabajo"),
          })),
        }),
      });
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const work = segments.filter((s) => s.type === "work").reduce((sum, s) => sum + (Number(s.duration_minutes) || 0), 0);
  const wait = segments.filter((s) => s.type === "wait").reduce((sum, s) => sum + (Number(s.duration_minutes) || 0), 0);
  const total = work + wait;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <h3 className="text-xl">Etapas de {serviceName}</h3>
      <p className="m-0 text-xs opacity-60">
        La mayoría de los servicios no las necesitan: un corte es un solo bloque. Usalas si hay esperas en el medio
        (ej. color). Ahí la duración del servicio pasa a ser la suma de las etapas, no un número aparte.
      </p>
      {loaded && segments.length === 0 && (
        <p className="m-0 text-sm opacity-70">
          Hoy dura {serviceDuration} min, sin etapas. Si agregás etapas, ese número se reemplaza por la suma.
        </p>
      )}
      <div className="flex flex-col gap-2">
        {segments.map((s, idx) => (
          <div key={idx} className="flex flex-col gap-2 bg-surface p-3">
            <div className="flex items-center gap-2">
              <Input
                className="flex-1 min-w-0"
                placeholder="Nombre de la etapa"
                value={s.label}
                onChange={(e) => updateSegment(idx, { label: e.target.value })}
              />
              <Input
                type="number"
                min={1}
                className="w-16 flex-none"
                value={s.duration_minutes}
                onChange={(e) => updateSegment(idx, { duration_minutes: Number(e.target.value) || 0 })}
                aria-label="Minutos"
              />
              <span className="text-xs opacity-55 flex-none">min</span>
              <button
                type="button"
                aria-label="Quitar etapa"
                onClick={() => removeSegment(idx)}
                className="size-9 flex-none flex items-center justify-center text-accent cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={s.type === "work" ? "primary" : "secondary"}
                className="flex-1"
                onClick={() => updateSegment(idx, { type: "work" })}
              >
                Trabajo
              </Button>
              <Button
                type="button"
                variant={s.type === "wait" ? "primary" : "secondary"}
                className="flex-1"
                onClick={() => updateSegment(idx, { type: "wait" })}
              >
                Espera
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button variant="secondary" onClick={addSegment}>
        + Agregar etapa
      </Button>
      {segments.length > 0 && (
        <div className="text-xs opacity-65">
          Duración del servicio: {total} min
          {wait > 0 ? ` · ${work} de trabajo, ${wait} de espera` : ""}
        </div>
      )}
      <Button variant="primary" block onClick={save} disabled={saving}>
        Guardar
      </Button>
    </Sheet>
  );
}
