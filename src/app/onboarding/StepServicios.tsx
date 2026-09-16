"use client";

import { useState } from "react";
import { Input } from "@/components/primitives/Input";
import { FormField } from "@/components/primitives/FormField";
import { Button } from "@/components/primitives/Button";
import { Card } from "@/components/primitives/Card";
import type { ServiceDraft } from "./types";

export function StepServicios({
  services,
  setServices,
  onAddService,
}: {
  services: ServiceDraft[];
  setServices: (s: ServiceDraft[]) => void;
  onAddService: (s: { name: string; duration_minutes: number; price: number }) => Promise<ServiceDraft | null>;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(30);
  const [price, setPrice] = useState("");

  function updateService(idx: number, patch: Partial<ServiceDraft>) {
    const next = [...services];
    next[idx] = { ...next[idx], ...patch };
    setServices(next);
  }

  async function confirmAdd() {
    const created = await onAddService({ name: name || "Servicio", duration_minutes: duration || 30, price: Number(price) || 0 });
    if (created) {
      setName("");
      setDuration(30);
      setPrice("");
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {services.map((sv, idx) => (
        <Card key={sv.id} className="gap-2.5">
          <Input placeholder="Nombre del servicio" value={sv.name} onChange={(e) => updateService(idx, { name: e.target.value })} />
          <div className="flex gap-2.5">
            <FormField label="Duración (min)" >
              <Input
                type="number"
                value={sv.duration_minutes}
                onChange={(e) => updateService(idx, { duration_minutes: Number(e.target.value) || 0 })}
              />
            </FormField>
            <FormField label="Precio">
              <Input type="number" value={sv.price} onChange={(e) => updateService(idx, { price: e.target.value })} />
            </FormField>
          </div>
        </Card>
      ))}

      {adding && (
        <Card className="gap-2.5">
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex gap-2.5">
            <FormField label="Duración (min)">
              <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value) || 0)} />
            </FormField>
            <FormField label="Precio">
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </FormField>
          </div>
          <Button variant="primary" block onClick={confirmAdd}>
            Agregar servicio
          </Button>
        </Card>
      )}

      <Button variant="secondary" onClick={() => setAdding((v) => !v)}>
        {adding ? "Cancelar" : "+ Agregar servicio"}
      </Button>
    </div>
  );
}
