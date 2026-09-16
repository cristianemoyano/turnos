"use client";

import { useState } from "react";
import { Sheet } from "@/components/primitives/Sheet";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { FormField } from "@/components/primitives/FormField";
import { Select } from "@/components/primitives/Select";

const DAY_OPTIONS = [
  { value: "Lunes", label: "Lunes" },
  { value: "Martes", label: "Martes" },
  { value: "Miércoles", label: "Miércoles" },
  { value: "Jueves", label: "Jueves" },
  { value: "Viernes", label: "Viernes" },
  { value: "Sábado", label: "Sábado" },
  { value: "Domingo", label: "Domingo" },
];

export function NewBlockSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [day, setDay] = useState("Lunes");
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("10:00");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await fetch("/api/v1/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day, from, to, reason: reason || null }),
      });
      setDay("Lunes");
      setFrom("09:00");
      setTo("10:00");
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
      <FormField label="Día" htmlFor="nb-day">
        <Select id="nb-day" options={DAY_OPTIONS} value={day} onChange={(e) => setDay(e.target.value)} />
      </FormField>
      <div className="flex items-center gap-2">
        <FormField label="Desde" htmlFor="nb-from">
          <Input id="nb-from" type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
        </FormField>
        <FormField label="Hasta" htmlFor="nb-to">
          <Input id="nb-to" type="time" value={to} onChange={(e) => setTo(e.target.value)} />
        </FormField>
      </div>
      <FormField label="Motivo" htmlFor="nb-reason">
        <Input id="nb-reason" placeholder="Ej: Vacaciones" value={reason} onChange={(e) => setReason(e.target.value)} />
      </FormField>
      <Button variant="primary" block onClick={submit} disabled={saving}>
        {saving ? "Guardando..." : "Guardar bloqueo"}
      </Button>
    </Sheet>
  );
}
