"use client";

import { useState } from "react";
import { Sheet } from "@/components/primitives/Sheet";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { FormField } from "@/components/primitives/FormField";
import { Badge } from "@/components/primitives/Badge";
import { money } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import { zonedTimeToUtc } from "@/lib/tz";
import type { SheetState } from "./types";

export function AppointmentSheet({
  sheet,
  onClose,
  onCreateAtSlot,
  onChanged,
  selectedDate,
  timezone,
}: {
  sheet: SheetState;
  onClose: () => void;
  onCreateAtSlot: (time: string) => void;
  onChanged: () => void;
  selectedDate: string;
  timezone: string;
}) {
  const [blockMode, setBlockMode] = useState(false);
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState(30);

  if (!sheet || sheet.type === "new") return null;

  function close() {
    setBlockMode(false);
    setReason("");
    onClose();
  }

  async function submitBlock(time: string) {
    const startAt = zonedTimeToUtc(selectedDate, time, timezone);
    await fetch("/api/v1/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "block",
        start_at: startAt.toISOString(),
        duration_minutes: duration,
        reason: reason || "Bloqueado",
      }),
    });
    onChanged();
    close();
  }

  async function patchStatus(id: string, status: "done" | "cancelled") {
    await fetch(`/api/v1/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onChanged();
    close();
  }

  async function unblock(id: string) {
    await fetch(`/api/v1/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unblock" }),
    });
    onChanged();
    close();
  }

  return (
    <Sheet open={!!sheet} onOpenChange={(o) => !o && close()}>
      {sheet.type === "slot" && !blockMode && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xl">Horario {sheet.time}</h3>
          <Button variant="primary" block onClick={() => onCreateAtSlot(sheet.time)}>
            Crear turno acá
          </Button>
          <Button variant="secondary" block onClick={() => setBlockMode(true)}>
            Bloquear este horario
          </Button>
        </div>
      )}

      {sheet.type === "slot" && blockMode && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xl">Bloquear {sheet.time}</h3>
          <FormField label="Motivo">
            <Input placeholder="Ej. Turno médico" value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
          <FormField label="Duración (min)">
            <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value) || 30)} />
          </FormField>
          <Button variant="primary" block onClick={() => submitBlock(sheet.time)}>
            Bloquear
          </Button>
        </div>
      )}

      {sheet.type === "block" && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xl">
            {new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(
              new Date(sheet.appointment.start_at),
            )}{" "}
            · Bloqueado
          </h3>
          <p className="text-sm opacity-80 m-0">{sheet.appointment.reason}</p>
          <Button variant="secondary" block onClick={() => unblock(sheet.appointment.id)}>
            Quitar bloqueo
          </Button>
        </div>
      )}

      {sheet.type === "appointment" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl">{sheet.appointment.client?.name}</h3>
            <Badge variant={sheet.appointment.status === "confirmed" ? "accent" : sheet.appointment.status === "done" ? "neutral" : "outline"}>
              {sheet.appointment.status === "confirmed" ? "Confirmado" : sheet.appointment.status === "done" ? "Atendido" : "Cancelado"}
            </Badge>
          </div>
          <p className="text-sm opacity-80 m-0">
            {sheet.appointment.service?.name} ·{" "}
            {new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(
              new Date(sheet.appointment.start_at),
            )}{" "}
            · {sheet.appointment.duration_minutes} min · {money(sheet.appointment.price)}
          </p>
          {sheet.appointment.status === "confirmed" && (
            <>
              <Button variant="primary" block onClick={() => patchStatus(sheet.appointment.id, "done")}>
                Marcar como atendido
              </Button>
              <a
                href={waLink(
                  sheet.appointment.client?.phone,
                  `Hola ${sheet.appointment.client?.name}! Te recordamos tu turno de ${sheet.appointment.service?.name}.`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="secondary" block>
                  Enviar recordatorio por WhatsApp
                </Button>
              </a>
              <Button variant="ghost" block onClick={() => patchStatus(sheet.appointment.id, "cancelled")}>
                Cancelar turno
              </Button>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}
