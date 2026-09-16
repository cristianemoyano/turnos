"use client";

import { useState } from "react";
import { Sheet } from "@/components/primitives/Sheet";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { FormField } from "@/components/primitives/FormField";

type Professional = { id: string; name: string };

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function NewBlockSheet({
  open,
  onOpenChange,
  onCreated,
  professionals,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  professionals: Professional[];
}) {
  const [fromDate, setFromDate] = useState(todayKey());
  const [toDate, setToDate] = useState(todayKey());
  const [fromTime, setFromTime] = useState("09:00");
  const [toTime, setToTime] = useState("19:00");
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/v1/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_date: fromDate,
          to_date: toDate,
          from_time: fromTime,
          to_time: toTime,
          professional_id: professionalId,
          reason: reason || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error || "No pudimos guardar el bloqueo");
        return;
      }
      setFromDate(todayKey());
      setToDate(todayKey());
      setFromTime("09:00");
      setToTime("19:00");
      setProfessionalId(null);
      setReason("");
      onOpenChange(false);
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <h3 className="text-xl">Nuevo bloqueo</h3>
      {professionals.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-text/70">Profesional afectado</span>
          <div className="flex flex-wrap gap-2">
            <Button variant={professionalId === null ? "primary" : "secondary"} size="sm" onClick={() => setProfessionalId(null)}>
              Todos
            </Button>
            {professionals.map((p) => (
              <Button
                key={p.id}
                variant={professionalId === p.id ? "primary" : "secondary"}
                size="sm"
                onClick={() => setProfessionalId(p.id)}
              >
                {p.name}
              </Button>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <FormField label="Desde" htmlFor="nb-from-date">
          <Input id="nb-from-date" type="date" min={todayKey()} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </FormField>
        <FormField label="Hasta" htmlFor="nb-to-date">
          <Input id="nb-to-date" type="date" min={fromDate} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </FormField>
      </div>
      <div className="flex items-center gap-2">
        <FormField label="Hora desde" htmlFor="nb-from-time">
          <Input id="nb-from-time" type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} />
        </FormField>
        <FormField label="Hora hasta" htmlFor="nb-to-time">
          <Input id="nb-to-time" type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} />
        </FormField>
      </div>
      <FormField label="Motivo" htmlFor="nb-reason">
        <Input id="nb-reason" placeholder="Ej: Vacaciones" value={reason} onChange={(e) => setReason(e.target.value)} />
      </FormField>
      {error && <p className="text-sm text-accent-700 m-0">{error}</p>}
      <Button variant="primary" block onClick={submit} disabled={saving}>
        {saving ? "Guardando..." : "Guardar bloqueo"}
      </Button>
    </Sheet>
  );
}
