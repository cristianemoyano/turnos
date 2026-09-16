"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/primitives/Sheet";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { FormField } from "@/components/primitives/FormField";

type Business = { name: string; phone: string | null; address: string | null };

export function EditBusinessSheet({
  business,
  open,
  onOpenChange,
  onSaved,
}: {
  business: Business | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !business) return;
    const current = business;
    let cancelled = false;
    async function sync() {
      await Promise.resolve();
      if (cancelled) return;
      setName(current.name ?? "");
      setPhone(current.phone ?? "");
      setAddress(current.address ?? "");
    }
    sync();
    return () => {
      cancelled = true;
    };
  }, [open, business]);

  async function submit() {
    setSaving(true);
    try {
      await fetch("/api/v1/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: phone || null, address: address || null }),
      });
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <h3 className="text-xl">Mi negocio</h3>
      <FormField label="Nombre" htmlFor="eb-name">
        <Input id="eb-name" value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField label="Teléfono" htmlFor="eb-phone">
        <Input id="eb-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </FormField>
      <FormField label="Dirección" htmlFor="eb-address">
        <Input id="eb-address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </FormField>
      <Button variant="primary" block onClick={submit} disabled={saving || !name.trim()}>
        {saving ? "Guardando..." : "Guardar"}
      </Button>
    </Sheet>
  );
}
