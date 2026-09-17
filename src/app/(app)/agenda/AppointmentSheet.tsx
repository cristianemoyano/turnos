"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/primitives/Sheet";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { FormField } from "@/components/primitives/FormField";
import { Badge } from "@/components/primitives/Badge";
import { Select } from "@/components/primitives/Select";
import { Checkbox } from "@/components/primitives/Checkbox";
import { money, formatTimeInTz, minutesToTimeString } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import { buildAppointmentWhatsAppMessage } from "@/lib/appointment-whatsapp";
import { zonedTimeToUtc, dateKeyInTz, localMinutesInTz, isStartInPast } from "@/lib/tz";
import { expandSegments } from "@/modules/agenda/segments";
import { isStaffOvertimeFit } from "@/modules/agenda/slot-fit";
import { emptyDayMessage, wantedSlotMessage, type WantedSlotInfo } from "./availabilityCopy";
import type { DayShift, Professional, RawAppointment, SheetState, AgendaBusinessInfo } from "./types";
import { cn } from "@/lib/cn";

function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function AppointmentSheet({
  sheet,
  onClose,
  onCreateAtSlot,
  onChanged,
  selectedDate,
  todayKey,
  timezone,
  professionals,
  selectedProfessionalId,
  businessInfo,
}: {
  sheet: SheetState;
  onClose: () => void;
  onCreateAtSlot: (time: string, overtime?: boolean, forgotten?: boolean) => void;
  onChanged: () => void;
  selectedDate: string;
  todayKey: string;
  timezone: string;
  professionals: Professional[];
  selectedProfessionalId: string | null;
  businessInfo: AgendaBusinessInfo;
}) {
  const [blockMode, setBlockMode] = useState(false);
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState(30);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(selectedDate);
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [rescheduleProfessionalId, setRescheduleProfessionalId] = useState<string | null>(null);
  const [rescheduleTimes, setRescheduleTimes] = useState<string[]>([]);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");
  const [rescheduleSaving, setRescheduleSaving] = useState(false);
  const [blockEditReason, setBlockEditReason] = useState("");
  const [blockEditDuration, setBlockEditDuration] = useState(30);
  const [blockEditDate, setBlockEditDate] = useState(selectedDate);
  const [blockEditTime, setBlockEditTime] = useState("");
  const [blockEditProfessionalId, setBlockEditProfessionalId] = useState<string | null>(null);
  const [blockEditError, setBlockEditError] = useState("");
  const [blockEditSaving, setBlockEditSaving] = useState(false);
  const [newBlockProfessionalId, setNewBlockProfessionalId] = useState<string | null>(null);

  const needsProfessional = professionals.length > 1;
  const appointment = sheet?.type === "appointment" ? sheet.appointment : null;
  const block = sheet?.type === "block" ? sheet.appointment : null;
  const canReschedule =
    appointment != null && appointment.status !== "cancelled" && appointment.status !== "done";

  const blockId = block?.id ?? null;
  const [loadedBlockId, setLoadedBlockId] = useState<string | null>(null);
  if (blockId !== loadedBlockId) {
    setLoadedBlockId(blockId);
    if (block) {
      const start = new Date(block.start_at);
      setBlockEditReason(block.reason ?? "");
      setBlockEditDuration(block.duration_minutes);
      setBlockEditDate(dateKeyInTz(start, timezone));
      setBlockEditTime(formatTimeInTz(start, timezone));
      setBlockEditProfessionalId(block.professional_id);
      setBlockEditError("");
    }
  }

  const slotKey = sheet?.type === "slot" ? sheet.time : null;
  const [loadedSlotKey, setLoadedSlotKey] = useState<string | null>(null);
  if (slotKey !== loadedSlotKey) {
    setLoadedSlotKey(slotKey);
    if (slotKey) {
      setNewBlockProfessionalId(selectedProfessionalId);
      setBlockMode(false);
      setReason("");
      setDuration(30);
    }
  }

  if (!sheet || sheet.type === "new") return null;

  const slotIsPast =
    sheet.type === "slot" && isStartInPast(zonedTimeToUtc(selectedDate, sheet.time, timezone));

  function close() {
    setBlockMode(false);
    setReason("");
    setRescheduleMode(false);
    setRescheduleError("");
    setBlockEditError("");
    onClose();
  }

  function startReschedule() {
    if (!appointment) return;
    const start = new Date(appointment.start_at);
    setRescheduleDate(dateKeyInTz(start, timezone));
    setRescheduleTime(formatTimeInTz(start, timezone));
    setRescheduleProfessionalId(appointment.professional_id);
    setRescheduleTimes([]);
    setRescheduleError("");
    setRescheduleMode(true);
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
        professional_id: needsProfessional ? newBlockProfessionalId : null,
      }),
    });
    onChanged();
    close();
  }

  async function patchStatus(id: string, status: "confirmed" | "done" | "cancelled") {
    await fetch(`/api/v1/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onChanged();
    close();
  }

  async function toggleDepositPaid(id: string, depositPaid: boolean) {
    await fetch(`/api/v1/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deposit_paid: depositPaid }),
    });
    onChanged();
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

  async function confirmReschedule() {
    if (!appointment || !rescheduleTime) return;
    if (needsProfessional && !rescheduleProfessionalId) return;
    setRescheduleSaving(true);
    setRescheduleError("");
    try {
      const startAt = zonedTimeToUtc(rescheduleDate, rescheduleTime, timezone);
      const res = await fetch(`/api/v1/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_at: startAt.toISOString(),
          professional_id: needsProfessional ? rescheduleProfessionalId : appointment.professional_id,
        }),
      });
      const json: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRescheduleError(json.error ?? "No se pudo mover el turno.");
        return;
      }
      onChanged();
      close();
    } catch {
      setRescheduleError("No se pudo mover el turno.");
    } finally {
      setRescheduleSaving(false);
    }
  }

  async function saveBlockEdit() {
    if (!block || !blockEditTime) return;
    setBlockEditSaving(true);
    setBlockEditError("");
    try {
      const startAt = zonedTimeToUtc(blockEditDate, blockEditTime, timezone);
      const res = await fetch(`/api/v1/appointments/${block.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit-block",
          start_at: startAt.toISOString(),
          duration_minutes: blockEditDuration,
          reason: blockEditReason.trim() || "Bloqueado",
          professional_id: needsProfessional ? blockEditProfessionalId : block.professional_id,
        }),
      });
      const json: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBlockEditError(json.error ?? "No se pudo guardar el bloqueo.");
        return;
      }
      onChanged();
      close();
    } catch {
      setBlockEditError("No se pudo guardar el bloqueo.");
    } finally {
      setBlockEditSaving(false);
    }
  }

  const blockProfessionalOptions = [
    { value: "all", label: "Todos" },
    ...professionals.map((p) => ({ value: p.id, label: p.name || "Sin nombre" })),
  ];

  return (
    <Sheet open={!!sheet} onOpenChange={(o) => !o && close()}>
      {sheet.type === "slot" && !blockMode && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xl">Horario {sheet.time}</h3>
          {slotIsPast ? (
            <>
              <p className="text-sm m-0">
                Este horario ya pasó. No se puede crear un turno pendiente. Si el cliente ya vino y no lo anotaste,
                registralo como atendido.
              </p>
              <Button variant="primary" block onClick={() => onCreateAtSlot(sheet.time, false, true)}>
                Registrar visita olvidada
              </Button>
            </>
          ) : (
            <>
              {sheet.overtime && (
                <p className="text-sm m-0">
                  Sobreturno: está fuera del horario de atención. Los clientes no pueden reservarlo online. Confirmá con
                  el profesional antes de agendar.
                </p>
              )}
              <Button variant="primary" block onClick={() => onCreateAtSlot(sheet.time, sheet.overtime)}>
                {sheet.overtime ? "Crear sobreturno acá" : "Crear turno acá"}
              </Button>
              <Button variant="secondary" block onClick={() => setBlockMode(true)}>
                Bloquear este horario
              </Button>
            </>
          )}
        </div>
      )}

      {sheet.type === "slot" && blockMode && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xl">Bloquear {sheet.time}</h3>
          {needsProfessional && (
            <FormField label="Afecta a">
              <Select
                value={newBlockProfessionalId ?? "all"}
                onChange={(e) => setNewBlockProfessionalId(e.target.value === "all" ? null : e.target.value)}
                options={blockProfessionalOptions}
              />
            </FormField>
          )}
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

      {sheet.type === "block" && block && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xl">Editar bloqueo</h3>
          {needsProfessional && (
            <FormField label="Afecta a">
              <Select
                value={blockEditProfessionalId ?? "all"}
                onChange={(e) => setBlockEditProfessionalId(e.target.value === "all" ? null : e.target.value)}
                options={blockProfessionalOptions}
              />
            </FormField>
          )}
          <FormField label="Fecha">
            <Input type="date" value={blockEditDate} onChange={(e) => setBlockEditDate(e.target.value)} />
          </FormField>
          <FormField label="Hora">
            <Input type="time" value={blockEditTime} onChange={(e) => setBlockEditTime(e.target.value)} />
          </FormField>
          <FormField label="Duración (min)">
            <Input
              type="number"
              value={blockEditDuration}
              onChange={(e) => setBlockEditDuration(Number(e.target.value) || 30)}
            />
          </FormField>
          <FormField label="Motivo">
            <Input
              placeholder="Ej. Turno médico"
              value={blockEditReason}
              onChange={(e) => setBlockEditReason(e.target.value)}
            />
          </FormField>
          {blockEditError && <p className="text-xs text-accent-700 m-0">{blockEditError}</p>}
          <Button variant="primary" block disabled={blockEditSaving || !blockEditTime} onClick={saveBlockEdit}>
            {blockEditSaving ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button variant="ghost" block onClick={() => unblock(block.id)}>
            Quitar bloqueo
          </Button>
        </div>
      )}

      {sheet.type === "appointment" && appointment && !rescheduleMode && (
        <AppointmentDetail
          key={`${appointment.id}:${sheet.stageLabel ?? ""}`}
          appointment={appointment}
          stageLabel={sheet.stageLabel}
          timezone={timezone}
          businessInfo={businessInfo}
          canReschedule={canReschedule}
          onReschedule={startReschedule}
          onConfirmInPerson={() => patchStatus(appointment.id, "confirmed")}
          onMarkDone={() => patchStatus(appointment.id, "done")}
          onCancel={() => patchStatus(appointment.id, "cancelled")}
          onToggleDeposit={() => toggleDepositPaid(appointment.id, !appointment.deposit_paid)}
        />
      )}

      {sheet.type === "appointment" && appointment && rescheduleMode && (
        <RescheduleForm
          appointmentId={appointment.id}
          serviceId={appointment.service_id}
          serviceName={appointment.service?.name ?? "este servicio"}
          durationMinutes={appointment.duration_minutes}
          wantedTime={formatTimeInTz(new Date(appointment.start_at), timezone)}
          todayKey={todayKey}
          date={rescheduleDate}
          time={rescheduleTime}
          professionalId={rescheduleProfessionalId}
          times={rescheduleTimes}
          loading={rescheduleLoading}
          error={rescheduleError}
          saving={rescheduleSaving}
          needsProfessional={needsProfessional}
          professionals={professionals}
          onDateChange={(next) => {
            setRescheduleDate(next);
            setRescheduleTime(null);
            setRescheduleError("");
          }}
          onTimeChange={setRescheduleTime}
          onProfessionalChange={(id) => {
            setRescheduleProfessionalId(id);
            setRescheduleError("");
          }}
          onTimes={setRescheduleTimes}
          onLoading={setRescheduleLoading}
          onBack={() => setRescheduleMode(false)}
          onConfirm={confirmReschedule}
        />
      )}
    </Sheet>
  );
}

function isStartInFuture(startAt: string, timezone: string): boolean {
  const start = new Date(startAt);
  const now = new Date();
  const startDay = dateKeyInTz(start, timezone);
  const today = dateKeyInTz(now, timezone);
  if (startDay !== today) return startDay > today;
  return localMinutesInTz(start, timezone) > localMinutesInTz(now, timezone);
}

const STATUS_COPY: Record<string, { label: string; hint: string | null; variant: "accent" | "accent2" | "neutral" | "outline" }> = {
  pending: { label: "Pendiente", hint: "Falta que el cliente confirme.", variant: "accent2" },
  confirmed: { label: "Confirmado", hint: null, variant: "accent" },
  done: { label: "Atendido", hint: null, variant: "neutral" },
  cancelled: { label: "Cancelado", hint: null, variant: "outline" },
};

function QuietAction({
  children,
  onClick,
  href,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}) {
  const className = cn(
    "flex items-center w-full min-h-9 py-1.5 px-0 text-sm font-semibold text-left bg-transparent border-0 cursor-pointer",
    danger ? "text-accent-700" : "text-text/60 hover:text-text",
  );
  if (href) {
    return (
      <a className={className} href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );
}

function AppointmentDetail({
  appointment,
  stageLabel,
  timezone,
  businessInfo,
  canReschedule,
  onReschedule,
  onConfirmInPerson,
  onMarkDone,
  onCancel,
  onToggleDeposit,
}: {
  appointment: RawAppointment;
  stageLabel?: string;
  timezone: string;
  businessInfo: AgendaBusinessInfo;
  canReschedule: boolean;
  onReschedule: () => void;
  onConfirmInPerson: () => void;
  onMarkDone: () => void;
  onCancel: () => void;
  onToggleDeposit: () => void;
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const status = STATUS_COPY[appointment.status] ?? STATUS_COPY.pending;
  const clientName = appointment.client?.name || "Sin cliente";
  const heading = stageLabel ? `${clientName} - ${stageLabel}` : clientName;
  const time = formatTimeInTz(new Date(appointment.start_at), timezone);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const messageBase = {
    clientName: appointment.client?.name || "",
    serviceName: appointment.service?.name,
    professionalName: appointment.professional?.name,
    startAt: appointment.start_at,
    timezone,
    address: businessInfo.address,
    depositRequired: appointment.deposit_required,
    depositPaid: appointment.deposit_paid,
    bankDetails: businessInfo.bankDetails,
    confirmationToken: appointment.confirmation_token,
    origin,
  };
  const askConfirmHref = waLink(
    appointment.client?.phone,
    buildAppointmentWhatsAppMessage({ ...messageBase, kind: "confirm_request" }),
  );
  const reminderHref = waLink(
    appointment.client?.phone,
    buildAppointmentWhatsAppMessage({ ...messageBase, kind: "reminder" }),
  );
  const hasWait = appointment.service?.segments?.some((s) => s.type === "wait");
  const startInFuture = isStartInFuture(appointment.start_at, timezone);
  const canMarkDone = appointment.status === "confirmed" && !startInFuture;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-xl">{heading}</h3>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        {status.hint && <p className="text-sm text-accent2-800 m-0">{status.hint}</p>}
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="text-lg font-heading font-extrabold m-0 tabular-nums">
          {time}
          <span className="text-sm font-semibold opacity-50"> · {appointment.duration_minutes} min</span>
        </p>
        {appointment.service?.name && <p className="text-sm m-0">{appointment.service.name}</p>}
        <p className="text-sm opacity-65 m-0">
          {money(appointment.price)}
          {appointment.professional?.name ? ` · ${appointment.professional.name}` : ""}
        </p>
      </div>

      {hasWait && appointment.service?.segments && (
        <div className="flex flex-col gap-0.5 text-xs border border-divider px-2.5 py-2">
          {expandSegments(appointment.duration_minutes, appointment.service.segments).map((piece, i) => {
            const startMin = localMinutesInTz(new Date(appointment.start_at), timezone) + piece.offsetMinutes;
            return (
              <div key={i} className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    piece.type === "wait" && "opacity-50",
                    piece.type === "work" && stageLabel && piece.label === stageLabel && "font-bold",
                  )}
                >
                  {minutesToTimeString(startMin)} ·{" "}
                  {piece.type === "wait" ? `Espera${piece.label ? ` · ${piece.label}` : ""}` : piece.label || "Trabajo"}
                </span>
                <span className="opacity-55">{piece.durationMinutes} min</span>
              </div>
            );
          })}
        </div>
      )}

      {appointment.deposit_required && (
        <div className="flex items-center justify-between gap-2 text-sm border border-divider p-2.5">
          <span>Seña {appointment.deposit_paid ? "pagada" : "pendiente"}: {money(appointment.deposit_required)}</span>
          <Button variant="secondary" size="sm" onClick={onToggleDeposit}>
            {appointment.deposit_paid ? "No pagada" : "Marcar pagada"}
          </Button>
        </div>
      )}

      {confirmingCancel ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm m-0">¿Cancelar el turno de {clientName}?</p>
          <Button variant="danger" block onClick={onCancel}>
            Confirmar
          </Button>
          <QuietAction onClick={() => setConfirmingCancel(false)}>Volver</QuietAction>
        </div>
      ) : (
        <>
          {appointment.status === "pending" && (
            <Button variant="primary" block size="lg" asChild>
              <a href={askConfirmHref} target="_blank" rel="noreferrer">
                Pedir confirmación por WhatsApp
              </a>
            </Button>
          )}

          {canMarkDone && (
            <Button variant="primary" block size="lg" onClick={onMarkDone}>
              Marcar atendido
            </Button>
          )}

          {(appointment.status === "pending" || appointment.status === "confirmed") && (
            <div className="flex flex-col">
              {appointment.status === "pending" && (
                <QuietAction onClick={onConfirmInPerson}>Confirmar en el local</QuietAction>
              )}
              {appointment.status === "confirmed" && (
                <QuietAction href={reminderHref}>Enviar recordatorio</QuietAction>
              )}
              {canReschedule && <QuietAction onClick={onReschedule}>Mover horario</QuietAction>}
              <QuietAction danger onClick={() => setConfirmingCancel(true)}>
                Cancelar turno
              </QuietAction>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RescheduleForm({
  appointmentId,
  serviceId,
  serviceName,
  durationMinutes,
  wantedTime,
  todayKey,
  date,
  time,
  professionalId,
  times,
  loading,
  error,
  saving,
  needsProfessional,
  professionals,
  onDateChange,
  onTimeChange,
  onProfessionalChange,
  onTimes,
  onLoading,
  onBack,
  onConfirm,
}: {
  appointmentId: string;
  serviceId: string | null;
  serviceName: string;
  durationMinutes: number;
  wantedTime: string;
  todayKey: string;
  date: string;
  time: string | null;
  professionalId: string | null;
  times: string[];
  loading: boolean;
  error: string;
  saving: boolean;
  needsProfessional: boolean;
  professionals: Professional[];
  onDateChange: (date: string) => void;
  onTimeChange: (time: string | null) => void;
  onProfessionalChange: (id: string) => void;
  onTimes: (times: string[]) => void;
  onLoading: (loading: boolean) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const professionalReady = !needsProfessional || !!professionalId;
  const [closed, setClosed] = useState(false);
  const [shifts, setShifts] = useState<DayShift[]>([]);
  const [wanted, setWanted] = useState<WantedSlotInfo | null>(null);
  const [overtimeConfirmed, setOvertimeConfirmed] = useState(false);

  useEffect(() => {
    if (!professionalReady) return;
    let ignore = false;
    onLoading(true);
    const professionalParam = professionalId ? `&professionalId=${professionalId}` : "";
    const serviceParam = serviceId ? `&serviceId=${serviceId}` : `&durationMinutes=${durationMinutes}`;
    const wantedParam = wantedTime ? `&wantedTime=${encodeURIComponent(wantedTime)}` : "";
    fetch(
      `/api/v1/agenda/availability?date=${date}${serviceParam}${professionalParam}&excludeAppointmentId=${appointmentId}${wantedParam}`,
    )
      .then((r) => r.json())
      .then((json) => {
        if (ignore) return;
        const nextTimes: string[] = json.data?.times ?? [];
        onTimes(nextTimes);
        setClosed(Boolean(json.data?.closed));
        setShifts(json.data?.shifts ?? []);
        setWanted(json.data?.wanted ?? null);
        if (time && !nextTimes.includes(time)) {
          const slot = json.data?.wanted as WantedSlotInfo | null | undefined;
          if (!(slot && slot.time === time && !slot.available && isStaffOvertimeFit(slot.reason))) {
            onTimeChange(null);
          }
        }
      })
      .finally(() => {
        if (!ignore) onLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [appointmentId, date, durationMinutes, professionalId, professionalReady, serviceId, wantedTime, onLoading, onTimes]);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xl">Mover turno</h3>

      {needsProfessional && (
        <>
          <span className="text-[11px] uppercase tracking-wide opacity-55">¿Quién lo hace?</span>
          <div className="flex flex-wrap gap-2">
            {professionals.map((p) => (
              <Button
                key={p.id}
                variant={professionalId === p.id ? "primary" : "secondary"}
                onClick={() => onProfessionalChange(p.id)}
              >
                {p.name || "Sin nombre"}
              </Button>
            ))}
          </div>
        </>
      )}

      {professionalReady && (
        <>
          <div className="flex gap-2">
            <Button
              variant={date === todayKey ? "primary" : "secondary"}
              block
              onClick={() => onDateChange(todayKey)}
            >
              Hoy
            </Button>
            <Button
              variant={date === shiftDateKey(todayKey, 1) ? "primary" : "secondary"}
              block
              onClick={() => onDateChange(shiftDateKey(todayKey, 1))}
            >
              Mañana
            </Button>
          </div>
          <FormField label="O elegí otra fecha">
            <Input type="date" min={todayKey} value={date} onChange={(e) => onDateChange(e.target.value)} />
          </FormField>
          <div className="flex flex-wrap gap-2">
            {loading && <p className="text-sm opacity-55 m-0">Buscando horarios…</p>}
            {!loading &&
              times.map((t) => (
                <Button
                  key={t}
                  variant={time === t ? "primary" : "secondary"}
                  onClick={() => {
                    onTimeChange(t);
                    setOvertimeConfirmed(false);
                  }}
                >
                  {t}
                </Button>
              ))}
            {!loading &&
              wanted &&
              !wanted.available &&
              isStaffOvertimeFit(wanted.reason) &&
              !times.includes(wanted.time) && (
                <Button
                  variant={time === wanted.time ? "primary" : "secondary"}
                  onClick={() => {
                    onTimeChange(wanted.time);
                    setOvertimeConfirmed(false);
                  }}
                >
                  {wanted.time} · sobreturno
                </Button>
              )}
          </div>
          {!loading && !time && (
            <p className="text-sm text-accent-700 m-0">
              {wantedSlotMessage(wanted, serviceName, durationMinutes, true) ||
                (times.length === 0
                  ? emptyDayMessage(closed, serviceName, durationMinutes, shifts)
                  : "Elegí un horario para continuar.")}
            </p>
          )}
          {time && wanted && !wanted.available && wanted.time === time && isStaffOvertimeFit(wanted.reason) && (
            <>
              <p className="text-sm m-0">{wantedSlotMessage(wanted, serviceName, durationMinutes, true)}</p>
              <Checkbox
                checked={overtimeConfirmed}
                onCheckedChange={setOvertimeConfirmed}
                label="Confirmo el sobreturno con el profesional"
              />
            </>
          )}
        </>
      )}

      {error && <p className="text-xs text-accent-700 m-0">{error}</p>}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>
          Atrás
        </Button>
        <Button
          variant="primary"
          block
          disabled={
            !time ||
            (needsProfessional && !professionalId) ||
            saving ||
            Boolean(
              time &&
                wanted &&
                !wanted.available &&
                wanted.time === time &&
                isStaffOvertimeFit(wanted.reason) &&
                !overtimeConfirmed,
            )
          }
          onClick={onConfirm}
        >
          {saving ? "Moviendo…" : "Confirmar cambio"}
        </Button>
      </div>
    </div>
  );
}
