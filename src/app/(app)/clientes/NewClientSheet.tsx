"use client";

import { useState } from "react";
import { Sheet } from "@/components/primitives/Sheet";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { FormField } from "@/components/primitives/FormField";

export function NewClientSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setName("");
    setPhone("");
    setError("");
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/v1/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          phone: phone.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "No se pudo guardar.");
        return;
      }
      reset();
      onOpenChange(false);
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <h3 className="text-xl">Nuevo cliente</h3>
      <FormField label="Nombre" htmlFor="nc-name" required>
        <Input id="nc-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </FormField>
      <FormField label="Teléfono" htmlFor="nc-phone">
        <Input
          id="nc-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
      </FormField>
      {error && <p className="text-xs text-accent-700 m-0">{error}</p>}
      <Button variant="primary" block onClick={submit} disabled={saving || !name.trim()}>
        {saving ? "Guardando..." : "Guardar cliente"}
      </Button>
    </Sheet>
  );
}
