"use client";

import { useState } from "react";
import { Sheet } from "@/components/primitives/Sheet";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { FormField } from "@/components/primitives/FormField";

type ApiService = {
  id: string;
  name: string;
  duration_minutes: number;
  price: string;
  deposit_amount: string | null;
};

export function EditServiceSheet({
  service,
  onOpenChange,
  onSaved,
  onDeleted,
}: {
  service: ApiService | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Re-seed the form from `service` whenever a different service is opened,
  // using React's "adjust state during render" pattern rather than an effect
  // (the sheet stays mounted across opens, so an effect would lag one paint
  // behind and briefly show the previous service's values).
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (service && service.id !== loadedId) {
    setLoadedId(service.id);
    setName(service.name);
    setDuration(String(service.duration_minutes));
    setPrice(service.price);
    setDeposit(service.deposit_amount ?? "");
  }

  if (!service) return null;

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/v1/services/${service!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          duration_minutes: Number(duration) || 30,
          price: Number(price) || 0,
          deposit_amount: deposit.trim() ? Number(deposit) : null,
        }),
      });
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`¿Eliminar "${service!.name}"? Los turnos ya registrados con este servicio no se ven afectados.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/v1/services/${service!.id}`, { method: "DELETE" });
      onOpenChange(false);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Sheet open={!!service} onOpenChange={onOpenChange}>
      <h3 className="text-xl">Editar servicio</h3>
      <FormField label="Nombre" htmlFor="es-name">
        <Input id="es-name" value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField label="Duración (min)" htmlFor="es-duration">
        <Input id="es-duration" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
      </FormField>
      <FormField label="Precio" htmlFor="es-price">
        <Input id="es-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
      </FormField>
      <FormField label="Seña requerida (opcional)" htmlFor="es-deposit">
        <Input id="es-deposit" type="number" placeholder="Sin seña" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
      </FormField>
      <Button variant="primary" block onClick={save} disabled={saving || !name}>
        {saving ? "Guardando..." : "Guardar cambios"}
      </Button>
      <Button variant="ghost" block onClick={remove} disabled={deleting}>
        {deleting ? "Eliminando..." : "Eliminar servicio"}
      </Button>
    </Sheet>
  );
}
