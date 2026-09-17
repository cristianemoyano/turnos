"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/primitives/Sheet";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { FormField } from "@/components/primitives/FormField";
import { Checkbox } from "@/components/primitives/Checkbox";
import { Card, CardTitle, CardBody, CardKicker } from "@/components/primitives/Card";
import { money } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import { buildAppointmentWhatsAppMessage } from "@/lib/appointment-whatsapp";
import { zonedTimeToUtc, dateLabelInTz } from "@/lib/tz";
import { cn } from "@/lib/cn";
import { isStaffOvertimeFit, whyDoesNotFit } from "@/modules/agenda/slot-fit";
import { emptyDayMessage, wantedSlotMessage, type WantedSlotInfo } from "./availabilityCopy";
import type { AgendaBusinessInfo, DayShift, Professional, ServiceInfo } from "./types";

type Client = { id: string; name: string; phone: string | null };
type StepKey = "service" | "professional" | "time" | "client" | "confirm";

function weekdayForDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function shiftFitWarning(shifts: DayShift[], time: string, durationMinutes: number): string | null {
  const fit = whyDoesNotFit(shifts, time, durationMinutes);
  if (fit?.code === "does_not_fit") return `Sobreturno: se pasa de las ${fit.shiftTo}`;
  if (fit?.code === "outside_hours") return "Sobreturno: fuera del horario de atención";
  return null;
}

function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function NewAppointmentSheet({
  open,
  onClose,
  onCreated,
  todayKey,
  initialDate,
  presetTime,
  professionals,
  timezone,
  presetProfessionalId,
  hoursRows,
  businessInfo,
  presetOvertime = false,
  forgottenVisit = false,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  todayKey: string;
  initialDate: string;
  presetTime?: string;
  professionals: Professional[];
  timezone: string;
  presetProfessionalId?: string | null;
  hoursRows: { day_of_week: string; is_open: boolean; shifts: DayShift[] }[];
  businessInfo: AgendaBusinessInfo;
  presetOvertime?: boolean;
  forgottenVisit?: boolean;
}) {
  const needsProfessional = professionals.length > 1;
  // Order matters: the professional (if any) and the service determine
  // duration-aware, professional-scoped availability, so both are chosen
  // *before* time — not after, when the "time" step would otherwise be
  // guessing at generic slots. Forgotten past visits skip time: the slot
  // was already tapped.
  const steps: StepKey[] = forgottenVisit
    ? needsProfessional
      ? ["service", "professional", "client", "confirm"]
      : ["service", "client", "confirm"]
    : needsProfessional
      ? ["service", "professional", "time", "client", "confirm"]
      : ["service", "time", "client", "confirm"];

  const [stepIndex, setStepIndex] = useState(0);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState<string | null>(null);
  const [times, setTimes] = useState<string[]>([]);
  const [services, setServices] = useState<ServiceInfo[]>([]);

  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [timesLoading, setTimesLoading] = useState(false);
  const [dayClosed, setDayClosed] = useState(false);
  const [dayShifts, setDayShifts] = useState<DayShift[]>([]);
  const [wanted, setWanted] = useState<WantedSlotInfo | null>(null);
  const [createError, setCreateError] = useState("");
  const [overtimeConfirmed, setOvertimeConfirmed] = useState(false);

  const [successInfo, setSuccessInfo] = useState<{
    clientName: string;
    clientPhone: string | null;
    serviceName: string;
    professionalName: string | null;
    time: string;
    dateLabel: string;
    startAtIso: string;
    confirmationToken: string;
    depositRequired: string | null;
    alreadyAttended?: boolean;
  } | null>(null);

  // Reset the wizard's form state on the open transition, using React's
  // "adjust state during render" pattern (not an effect) since this only
  // needs to run once when `open` flips true — the sheet stays mounted
  // across opens (AgendaClient renders it unconditionally).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStepIndex(0);
      setDate(forgottenVisit || initialDate >= todayKey ? initialDate : todayKey);
      setTime(presetTime ?? null);
      setMode("existing");
      setClientQuery("");
      setClientId(null);
      setNewName("");
      setNewPhone("");
      setServiceId(null);
      setProfessionalId(presetProfessionalId ?? null);
      setSuccessInfo(null);
      setCreateError("");
      setWanted(null);
      setTimes([]);
      setOvertimeConfirmed(false);
    }
  }

  const currentStep = steps[stepIndex];

  // Service list is independent of the chosen day; fetch it once per open.
  useEffect(() => {
    if (!open) return;
    let ignore = false;
    fetch(`/api/v1/agenda/availability?date=${todayKey}`)
      .then((r) => r.json())
      .then((json) => {
        if (!ignore) setServices(json.data?.services ?? []);
      });
    return () => {
      ignore = true;
    };
  }, [open, todayKey]);

  const selectedService = services.find((s) => s.id === serviceId) ?? null;

  useEffect(() => {
    if (!open || currentStep !== "time" || !selectedService) return;
    let ignore = false;
    setTimesLoading(true);
    const professionalParam = professionalId ? `&professionalId=${professionalId}` : "";
    const wantedTime = date === initialDate && presetTime ? `&wantedTime=${encodeURIComponent(presetTime)}` : "";
    fetch(
      `/api/v1/agenda/availability?date=${date}&serviceId=${selectedService.id}${professionalParam}${wantedTime}`,
    )
      .then((r) => r.json())
      .then((json) => {
        if (ignore) return;
        const nextTimes: string[] = json.data?.times ?? [];
        setTimes(nextTimes);
        setDayClosed(Boolean(json.data?.closed));
        setDayShifts(json.data?.shifts ?? []);
        setWanted(json.data?.wanted ?? null);
        setTime((current) => {
          const candidate = current ?? (date === initialDate ? presetTime : undefined);
          if (!candidate) return null;
          if (nextTimes.includes(candidate)) return candidate;
          const slot = json.data?.wanted as WantedSlotInfo | null | undefined;
          if (slot && slot.time === candidate && !slot.available && isStaffOvertimeFit(slot.reason)) {
            return candidate;
          }
          return null;
        });
      })
      .finally(() => {
        if (!ignore) setTimesLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [open, currentStep, date, professionalId, selectedService, initialDate, presetTime]);

  useEffect(() => {
    if (mode !== "existing" || !open) return;
    const q = clientQuery.trim();
    const controller = new AbortController();
    fetch(`/api/v1/clients?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => setClientResults((json.data ?? []).slice(0, 6)))
      .catch(() => {});
    return () => controller.abort();
  }, [clientQuery, mode, open]);

  const selectedClient = clientResults.find((c) => c.id === clientId) ?? null;
  const dateLabel = dateLabelInTz(new Date(date + "T12:00:00"), timezone);
  const durationMinutes = selectedService?.duration_minutes ?? 0;
  const hoursForDate = hoursRows.find((h) => h.day_of_week === weekdayForDateKey(date));
  const overtimeSlot =
    !forgottenVisit &&
    (Boolean(time && wanted && !wanted.available && wanted.time === time && isStaffOvertimeFit(wanted.reason)) ||
      Boolean(presetOvertime && time && presetTime === time && date === initialDate && (!wanted || wanted.time === time)));
  const timeHint =
    !timesLoading && selectedService && !time
      ? wantedSlotMessage(wanted, selectedService.name, durationMinutes, true) ||
        (times.length === 0
          ? emptyDayMessage(dayClosed, selectedService.name, durationMinutes, dayShifts)
          : "Elegí un horario para continuar.")
      : null;

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }
  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  async function confirm() {
    if (!time || !selectedService) return;
    if (overtimeSlot && !overtimeConfirmed) return;
    setCreateError("");
    const startAt = zonedTimeToUtc(date, time, timezone);
    const body: Record<string, unknown> = {
      kind: "appointment",
      service_id: selectedService.id,
      start_at: startAt.toISOString(),
      professional_id: professionalId,
    };
    if (forgottenVisit) body.status = "done";
    if (mode === "existing") body.client_id = clientId;
    else body.client = { name: newName, phone: newPhone };

    const res = await fetch("/api/v1/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setCreateError(json.error || "No se pudo crear el turno. Probá otro horario.");
      return;
    }
    const json = await res.json();
    const clientName = mode === "existing" ? (selectedClient?.name ?? "") : newName;
    const clientPhone = mode === "existing" ? (selectedClient?.phone ?? null) : newPhone;
    const professionalName =
      professionals.find((p) => p.id === professionalId)?.name ?? null;
    setSuccessInfo({
      clientName,
      clientPhone,
      serviceName: selectedService.name,
      professionalName,
      time,
      dateLabel,
      startAtIso: startAt.toISOString(),
      confirmationToken: json.data?.confirmation_token,
      depositRequired: selectedService.deposit_amount,
      alreadyAttended: forgottenVisit,
    });
    onCreated();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <div className="flex flex-col gap-3.5">
        {!successInfo && (
          <div className="flex items-center justify-between">
            <h3 className="text-xl">{forgottenVisit ? "Registrar visita olvidada" : "Nuevo turno"}</h3>
            <span className="text-xs opacity-55">
              Paso {stepIndex + 1} de {steps.length}
            </span>
          </div>
        )}

        {!successInfo && currentStep === "service" && (
          <>
            {forgottenVisit && (
              <p className="text-sm m-0">
                {dateLabel} · {presetTime}. Se guarda como ya atendida, sin pedirle confirmación al cliente.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {services.map((s) => {
                const warning =
                  !forgottenVisit && presetTime && hoursForDate?.is_open
                    ? shiftFitWarning(hoursForDate.shifts ?? [], presetTime, s.duration_minutes)
                    : null;
                return (
                  <Card key={s.id} elevated className={cn("cursor-pointer", serviceId === s.id && "ring-2 ring-accent")}>
                    <div onClick={() => setServiceId(s.id)}>
                      <CardTitle>{s.name}</CardTitle>
                      <CardBody>
                        {s.duration_minutes} min · {money(s.price)}
                        {s.segments?.some((seg) => seg.type === "wait") && " · con espera"}
                        {s.deposit_amount && ` · Seña ${money(s.deposit_amount)}`}
                      </CardBody>
                      {warning && <p className="text-xs text-accent-700 m-0">{warning}</p>}
                    </div>
                  </Card>
                );
              })}
            </div>
            <Button variant="primary" block disabled={!serviceId} onClick={goNext}>
              Continuar
            </Button>
          </>
        )}

        {!successInfo && currentStep === "professional" && (
          <>
            <span className="text-[11px] uppercase tracking-wide opacity-55">¿Quién lo hace?</span>
            <div className="flex flex-wrap gap-2">
              {professionals.map((p) => (
                <Button
                  key={p.id}
                  variant={professionalId === p.id ? "primary" : "secondary"}
                  onClick={() => {
                    setProfessionalId(p.id);
                    setTime(null);
                  }}
                >
                  {p.name || "Sin nombre"}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={goBack}>
                Atrás
              </Button>
              <Button variant="primary" block disabled={!professionalId} onClick={goNext}>
                Continuar
              </Button>
            </div>
          </>
        )}

        {!successInfo && currentStep === "time" && (
          <>
            <div className="flex gap-2">
              <Button variant={date === todayKey ? "primary" : "secondary"} block onClick={() => { setDate(todayKey); setTime(null); }}>
                Hoy
              </Button>
              <Button
                variant={date === shiftDateKey(todayKey, 1) ? "primary" : "secondary"}
                block
                onClick={() => { setDate(shiftDateKey(todayKey, 1)); setTime(null); }}
              >
                Mañana
              </Button>
            </div>
            <FormField label="O elegí otra fecha">
              <Input
                type="date"
                min={todayKey}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setTime(null);
                }}
              />
            </FormField>
            <div className="flex flex-wrap gap-2">
              {timesLoading && <p className="text-sm opacity-55 m-0">Buscando horarios…</p>}
              {!timesLoading &&
                times.map((t) => (
                  <Button
                    key={t}
                    variant={time === t ? "primary" : "secondary"}
                    onClick={() => {
                      setTime(t);
                      setOvertimeConfirmed(false);
                    }}
                  >
                    {t}
                  </Button>
                ))}
              {!timesLoading &&
                wanted &&
                !wanted.available &&
                isStaffOvertimeFit(wanted.reason) &&
                !times.includes(wanted.time) && (
                  <Button
                    variant={time === wanted.time ? "primary" : "secondary"}
                    onClick={() => {
                      setTime(wanted.time);
                      setOvertimeConfirmed(false);
                    }}
                  >
                    {wanted.time} · sobreturno
                  </Button>
                )}
            </div>
            {timeHint && (
              <p className={cn("text-sm m-0", times.length === 0 || wanted?.available === false ? "text-accent-700" : "opacity-55")}>
                {timeHint}
              </p>
            )}
            {overtimeSlot && time && (
              <>
                <p className="text-sm m-0">
                  {wantedSlotMessage(
                    wanted && wanted.time === time ? wanted : { time, available: false, reason: "outside_hours" },
                    selectedService?.name ?? "El servicio",
                    durationMinutes,
                    true,
                  )}
                </p>
                <Checkbox
                  checked={overtimeConfirmed}
                  onCheckedChange={setOvertimeConfirmed}
                  label="Confirmo el sobreturno con el profesional"
                />
              </>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={goBack}>
                Atrás
              </Button>
              <Button variant="primary" block disabled={!time || (overtimeSlot && !overtimeConfirmed)} onClick={goNext}>
                Continuar
              </Button>
            </div>
          </>
        )}

        {!successInfo && currentStep === "client" && (
          <>
            <div className="flex gap-2">
              <Button variant={mode === "existing" ? "primary" : "secondary"} block onClick={() => setMode("existing")}>
                Cliente existente
              </Button>
              <Button variant={mode === "new" ? "primary" : "secondary"} block onClick={() => setMode("new")}>
                Cliente nuevo
              </Button>
            </div>
            {mode === "existing" ? (
              <>
                <Input placeholder="Buscar cliente" value={clientQuery} onChange={(e) => setClientQuery(e.target.value)} />
                <div className="flex flex-col max-h-[180px] overflow-auto">
                  {clientResults.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setClientId(c.id)}
                      className={cn("py-2.5 px-1 border-b border-divider cursor-pointer", clientId === c.id && "bg-accent-100")}
                    >
                      <div className="text-sm font-semibold">{c.name}</div>
                      <div className="text-xs opacity-60">{c.phone}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <FormField label="Nombre">
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
                </FormField>
                <FormField label="Teléfono">
                  <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                </FormField>
              </>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={goBack}>
                Atrás
              </Button>
              <Button
                variant="primary"
                block
                disabled={mode === "existing" ? !clientId : !newName || !newPhone}
                onClick={goNext}
              >
                Continuar
              </Button>
            </div>
          </>
        )}

        {!successInfo && currentStep === "confirm" && selectedService && (
          <>
            <Card elevated>
              <CardKicker>
                {dateLabel} · {time}
                {professionalId && ` · ${professionals.find((p) => p.id === professionalId)?.name}`}
                {overtimeSlot ? " · Sobreturno" : ""}
              </CardKicker>
              <CardTitle>{mode === "existing" ? selectedClient?.name : newName}</CardTitle>
              <CardBody>
                {selectedService.name} · {selectedService.duration_minutes} min · {money(selectedService.price)}
                {selectedService.segments?.some((seg) => seg.type === "wait") &&
                  " · incluye espera (el profesional queda libre en esos minutos)"}
                {selectedService.deposit_amount && ` · Seña requerida: ${money(selectedService.deposit_amount)}`}
              </CardBody>
            </Card>
            {overtimeSlot && (
              <p className="text-sm m-0">
                Sobreturno fuera del horario de atención. El profesional acepta atender en este horario. Los clientes no
                pueden reservarlo online.
              </p>
            )}
            <p className="text-xs opacity-60 m-0">
              {forgottenVisit
                ? "Se registra como ya atendida. No se envía confirmación por WhatsApp."
                : "El turno queda pendiente hasta que el cliente lo confirme por el link que le vas a enviar por WhatsApp."}
            </p>
            {createError && <p className="text-sm text-accent-700 m-0">{createError}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={goBack}>
                Atrás
              </Button>
              <Button variant="primary" block onClick={confirm}>
                {forgottenVisit ? "Registrar visita" : "Crear turno"}
              </Button>
            </div>
          </>
        )}

        {successInfo && (
          <>
            <div className="flex flex-col items-center gap-2.5 py-2">
              <div className="size-13 rounded-full bg-accent-100 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h3 className="text-xl">
                {successInfo.alreadyAttended ? "Visita registrada" : "Turno pendiente de confirmación"}
              </h3>
              <p className="m-0 text-center text-sm opacity-70">
                {successInfo.clientName} · {successInfo.dateLabel} {successInfo.time} · {successInfo.serviceName}
              </p>
            </div>
            {!successInfo.alreadyAttended && (
              <a
                href={waLink(
                  successInfo.clientPhone,
                  buildAppointmentWhatsAppMessage({
                    kind: "confirm_request",
                    clientName: successInfo.clientName,
                    serviceName: successInfo.serviceName,
                    professionalName: successInfo.professionalName,
                    startAt: successInfo.startAtIso,
                    timezone,
                    address: businessInfo.address,
                    depositRequired: successInfo.depositRequired,
                    depositPaid: false,
                    bankDetails: businessInfo.bankDetails,
                    confirmationToken: successInfo.confirmationToken,
                    origin: typeof window !== "undefined" ? window.location.origin : "",
                  }),
                )}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="primary" block>
                  Enviar por WhatsApp para confirmar
                </Button>
              </a>
            )}
            <Button variant={successInfo.alreadyAttended ? "primary" : "secondary"} block onClick={onClose}>
              Listo
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}
