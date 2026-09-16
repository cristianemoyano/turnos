"use client";

import { useState } from "react";
import { Sheet } from "@/components/primitives/Sheet";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { FormField } from "@/components/primitives/FormField";

export function NewServiceSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await fetch("/api/v1/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, duration_minutes: Number(duration) || 30, price: Number(price) || 0 }),
      });
      setName("");
      setDuration("30");
      setPrice("");
      onOpenChange(false);
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <h3 className="text-xl">Nuevo servicio</h3>
      <FormField label="Nombre" htmlFor="ns-name">
        <Input id="ns-name" value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField label="Duración (min)" htmlFor="ns-duration">
        <Input id="ns-duration" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
      </FormField>
      <FormField label="Precio" htmlFor="ns-price">
        <Input id="ns-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
      </FormField>
      <Button variant="primary" block onClick={submit} disabled={saving || !name}>
        {saving ? "Guardando..." : "Guardar servicio"}
      </Button>
    </Sheet>
  );
}
