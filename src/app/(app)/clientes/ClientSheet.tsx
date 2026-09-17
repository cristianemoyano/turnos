"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/primitives/Sheet";
import { Button } from "@/components/primitives/Button";
import { Input, Textarea } from "@/components/primitives/Input";
import { FormField } from "@/components/primitives/FormField";
import { money } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import { PHONE_HINT, PHONE_PLACEHOLDER } from "@/lib/phone";

type ClientRow = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
};

type HistoryAppointment = {
  id: string;
  start_at: string;
  price: string | null;
  status: "pending" | "confirmed" | "done" | "cancelled";
  service?: { name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  done: "Atendido",
  cancelled: "Cancelado",
};

export function ClientSheet({
  clientId,
  open,
  onOpenChange,
  onSaved,
}: {
  clientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [client, setClient] = useState<ClientRow | null>(null);
  const [appointments, setAppointments] = useState<HistoryAppointment[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !clientId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/v1/clients/${clientId}`);
      const json = await res.json();
      if (cancelled) return;
      const next: ClientRow | undefined = json.data?.client;
      setClient(next ?? null);
      setAppointments(json.data?.appointments ?? []);
      setName(next?.name ?? "");
      setPhone(next?.phone ?? "");
      setNotes(next?.notes ?? "");
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open, clientId]);

  async function save() {
    if (!clientId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          phone: phone.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "No se pudo guardar.");
        return;
      }
      setClient((c) => (c ? { ...c, name: trimmed, phone: phone.trim() || null, notes: notes.trim() || null } : c));
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const visits = appointments.filter((a) => a.status !== "cancelled").length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {loading || !client ? (
        <p className="text-sm opacity-60">Cargando...</p>
      ) : (
        <>
          <h3 className="text-xl">Editar cliente</h3>
          <p className="m-0 text-[13px] opacity-65">
            {visits === 1 ? "1 visita" : `${visits} visitas`}
          </p>
          <FormField label="Nombre" htmlFor="client-name" required>
            <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </FormField>
          <FormField label="Teléfono" htmlFor="client-phone" hint={PHONE_HINT}>
            <Input
              id="client-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder={PHONE_PLACEHOLDER}
            />
          </FormField>
          <FormField label="Notas" htmlFor="client-notes">
            <Textarea id="client-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
          {error && <p className="text-xs text-accent-700 m-0">{error}</p>}
          {phone.trim() && (
            <div className="flex gap-2">
              <Button asChild variant="secondary" block>
                <a href={`tel:${phone.replace(/\s/g, "")}`}>Llamar</a>
              </Button>
              <Button asChild variant="primary" block>
                <a href={waLink(phone.trim(), `Hola ${name}!`)} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              </Button>
            </div>
          )}
          <Button variant="primary" block onClick={save} disabled={saving || !name.trim()}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] tracking-[0.08em] uppercase opacity-55">Historial</span>
            {appointments.length === 0 && <span className="text-sm opacity-50">Sin turnos todavía</span>}
            {appointments.map((a) => (
              <div key={a.id} className="text-[13px] opacity-80">
                {new Date(a.start_at).toLocaleDateString("es-AR")} · {a.service?.name ?? "Servicio"} ·{" "}
                {money(a.price)} · {STATUS_LABEL[a.status] ?? a.status}
              </div>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
