"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/primitives/Sheet";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { FormField } from "@/components/primitives/FormField";
import { Card, CardTitle, CardBody, CardKicker } from "@/components/primitives/Card";
import { money } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import { zonedTimeToUtc } from "@/lib/tz";
import { cn } from "@/lib/cn";
import type { Professional, ServiceInfo } from "./types";

type Client = { id: string; name: string; phone: string | null };

export function NewAppointmentSheet({
  open,
  onClose,
  onCreated,
  todayKey,
  tomorrowKey,
  presetTime,
  professionals,
  timezone,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  todayKey: string;
  tomorrowKey: string;
  presetTime?: string;
  professionals: Professional[];
  timezone: string;
}) {
  const [step, setStep] = useState(0);
  const [day, setDay] = useState<"hoy" | "mañana">("hoy");
  const [time, setTime] = useState<string | null>(presetTime ?? null);
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

  const [successInfo, setSuccessInfo] = useState<{ clientName: string; serviceName: string; time: string } | null>(null);

  // Reset the wizard's form state on the open transition, using React's
  // "adjust state during render" pattern (not an effect) since this only
  // needs to run once when `open` flips true — the sheet stays mounted
  // across opens (AgendaClient renders it unconditionally).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStep(presetTime ? 1 : 0);
      setDay("hoy");
      setTime(presetTime ?? null);
      setMode("existing");
      setClientQuery("");
      setClientId(null);
      setNewName("");
      setNewPhone("");
      setServiceId(null);
      setProfessionalId(null);
      setSuccessInfo(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    const date = day === "hoy" ? todayKey : tomorrowKey;
    fetch(`/api/v1/agenda/availability?date=${date}`)
      .then((r) => r.json())
      .then((json) => {
        setTimes(json.data.times);
        setServices(json.data.services);
      });
  }, [open, day, todayKey, tomorrowKey]);

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

  const selectedService = services.find((s) => s.id === serviceId) ?? null;
  const selectedClient = clientResults.find((c) => c.id === clientId) ?? null;

  async function confirm() {
    if (!time || !selectedService) return;
    const date = day === "hoy" ? todayKey : tomorrowKey;
    const startAt = zonedTimeToUtc(date, time, timezone);
    const body: Record<string, unknown> = {
      kind: "appointment",
      service_id: selectedService.id,
      start_at: startAt.toISOString(),
      professional_id: professionalId,
    };
    if (mode === "existing") body.client_id = clientId;
    else body.client = { name: newName, phone: newPhone };

    const res = await fetch("/api/v1/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    setSuccessInfo({
      clientName: mode === "existing" ? (selectedClient?.name ?? "") : newName,
      serviceName: selectedService.name,
      time,
    });
    setStep(4);
    onCreated();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <div className="flex flex-col gap-3.5">
        {step < 4 && (
          <div className="flex items-center justify-between">
            <h3 className="text-xl">Nuevo turno</h3>
            <span className="text-xs opacity-55">Paso {step + 1} de 4</span>
          </div>
        )}

        {step === 0 && (
          <>
            <div className="flex gap-2">
              <Button variant={day === "hoy" ? "primary" : "secondary"} block onClick={() => setDay("hoy")}>
                Hoy
              </Button>
              <Button variant={day === "mañana" ? "primary" : "secondary"} block onClick={() => setDay("mañana")}>
                Mañana
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {times.map((t) => (
                <Button key={t} variant={time === t ? "primary" : "secondary"} onClick={() => setTime(t)}>
                  {t}
                </Button>
              ))}
              {times.length === 0 && <p className="text-sm opacity-55 m-0">No hay horarios disponibles.</p>}
            </div>
            <Button variant="primary" block disabled={!time} onClick={() => setStep(1)}>
              Continuar
            </Button>
          </>
        )}

        {step === 1 && (
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
              <Button variant="secondary" onClick={() => setStep(0)}>
                Atrás
              </Button>
              <Button
                variant="primary"
                block
                disabled={mode === "existing" ? !clientId : !newName || !newPhone}
                onClick={() => setStep(2)}
              >
                Continuar
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex flex-col gap-2">
              {services.map((s) => (
                <Card
                  key={s.id}
                  elevated
                  className={cn("cursor-pointer", serviceId === s.id && "ring-2 ring-accent")}
                >
                  <div onClick={() => setServiceId(s.id)}>
                    <CardTitle>{s.name}</CardTitle>
                    <CardBody>
                      {s.duration_minutes} min · {money(s.price)}
                    </CardBody>
                  </div>
                </Card>
              ))}
            </div>
            {professionals.length > 1 && (
              <>
                <span className="text-[11px] uppercase tracking-wide opacity-55">¿Quién lo hace?</span>
                <div className="flex flex-wrap gap-2">
                  {professionals.map((p) => (
                    <Button key={p.id} variant={professionalId === p.id ? "primary" : "secondary"} onClick={() => setProfessionalId(p.id)}>
                      {p.name || "Sin nombre"}
                    </Button>
                  ))}
                </div>
              </>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button
                variant="primary"
                block
                disabled={!serviceId || (professionals.length > 1 && !professionalId)}
                onClick={() => setStep(3)}
              >
                Continuar
              </Button>
            </div>
          </>
        )}

        {step === 3 && selectedService && (
          <>
            <Card elevated>
              <CardKicker>
                {day === "hoy" ? "Hoy" : "Mañana"} · {time}
              </CardKicker>
              <CardTitle>{mode === "existing" ? selectedClient?.name : newName}</CardTitle>
              <CardBody>
                {selectedService.name} · {selectedService.duration_minutes} min · {money(selectedService.price)}
              </CardBody>
            </Card>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Atrás
              </Button>
              <Button variant="primary" block onClick={confirm}>
                Confirmar turno
              </Button>
            </div>
          </>
        )}

        {step === 4 && successInfo && (
          <>
            <div className="flex flex-col items-center gap-2.5 py-2.5">
              <div className="size-13 rounded-full bg-accent-100 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h3 className="text-xl">Turno creado</h3>
              <p className="m-0 text-center text-sm opacity-70">
                {successInfo.clientName} · {successInfo.time} · {successInfo.serviceName}
              </p>
            </div>
            <a
              href={waLink(null, `Hola ${successInfo.clientName}! Te agendé un turno para ${successInfo.serviceName} a las ${successInfo.time}.`)}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="primary" block>
                Enviar confirmación por WhatsApp
              </Button>
            </a>
            <Button variant="secondary" block onClick={onClose}>
              Listo
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}
