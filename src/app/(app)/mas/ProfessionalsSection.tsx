"use client";

import { useState } from "react";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { Card, CardKicker, CardTitle } from "@/components/primitives/Card";

type Professional = { id: string; name: string; phone: string | null };

export function ProfessionalsSection({
  professionals,
  onRefresh,
}: {
  professionals: Professional[];
  onRefresh: () => void;
}) {
  const [adding, setAdding] = useState(false);

  async function updateProfessional(id: string, patch: { name?: string; phone?: string | null }) {
    await fetch(`/api/v1/professionals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    onRefresh();
  }

  async function removeProfessional(id: string) {
    await fetch(`/api/v1/professionals/${id}`, { method: "DELETE" });
    onRefresh();
  }

  async function addProfessional() {
    setAdding(true);
    try {
      await fetch("/api/v1/professionals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Nuevo profesional", phone: null }),
      });
      onRefresh();
    } finally {
      setAdding(false);
    }
  }

  return (
    <Card>
      <CardKicker>Equipo</CardKicker>
      <CardTitle>Profesionales</CardTitle>
      <div className="flex flex-col gap-2">
        {professionals.map((p) => (
          <div key={p.id} className="flex items-center gap-2">
            <Input
              className="flex-1"
              defaultValue={p.name}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && value !== p.name) updateProfessional(p.id, { name: value });
              }}
            />
            <Input
              className="flex-1"
              placeholder="Teléfono"
              defaultValue={p.phone ?? ""}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value !== (p.phone ?? "")) updateProfessional(p.id, { phone: value || null });
              }}
            />
            {professionals.length > 1 && (
              <button
                type="button"
                aria-label="Quitar profesional"
                onClick={() => removeProfessional(p.id)}
                className="size-9 flex-none flex items-center justify-center text-accent cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
      <Button variant="ghost" className="self-start" onClick={addProfessional} disabled={adding}>
        + Agregar profesional
      </Button>
    </Card>
  );
}
