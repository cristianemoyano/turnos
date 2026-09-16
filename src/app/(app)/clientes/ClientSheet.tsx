"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/primitives/Sheet";
import { Button } from "@/components/primitives/Button";
import { Textarea } from "@/components/primitives/Input";
import { money } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";

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
  status: "confirmed" | "done" | "cancelled";
  service?: { name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
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
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !clientId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/v1/clients/${clientId}`);
      const json = await res.json();
      if (cancelled) return;
      setClient(json.data.client);
      setAppointments(json.data.appointments ?? []);
      setNote(json.data.client.notes ?? "");
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open, clientId]);

  async function saveNote() {
    if (!clientId) return;
    setSaving(true);
    try {
      await fetch(`/api/v1/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: note || null }),
      });
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
          <h3 className="text-xl">{client.name}</h3>
          <p className="m-0 text-[13px] opacity-65">
            {client.phone || "Sin teléfono"} · {visits === 1 ? "1 visita" : `${visits} visitas`}
          </p>
          <div className="flex gap-2">
            <Button asChild variant="secondary" block>
              <a href={`tel:${(client.phone || "").replace(/\s/g, "")}`}>Llamar</a>
            </Button>
            <Button asChild variant="primary" block>
              <a href={waLink(client.phone, `Hola ${client.name}!`)} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text/70">Notas</label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button variant="secondary" className="self-start" onClick={saveNote} disabled={saving}>
            {saving ? "Guardando..." : "Guardar nota"}
          </Button>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] tracking-[0.08em] uppercase opacity-55">Historial</span>
            {appointments.length === 0 && <span className="text-sm opacity-50">Sin turnos todavía</span>}
            {appointments.map((a) => (
              <div key={a.id} className="text-[13px] opacity-80">
                {new Date(a.start_at).toLocaleDateString("es-AR")} · {a.service?.name ?? "Servicio"} ·{" "}
                {money(a.price)} · {STATUS_LABEL[a.status]}
              </div>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
