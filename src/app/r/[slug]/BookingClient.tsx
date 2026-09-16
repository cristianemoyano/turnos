"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { FormField } from "@/components/primitives/FormField";
import { Card, CardTitle, CardBody } from "@/components/primitives/Card";
import { money } from "@/lib/format";
import { dateKeyInTz, zonedTimeToUtc } from "@/lib/tz";

interface ServiceDTO {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
}

interface ProfessionalDTO {
  id: string;
  name: string;
}

interface DayOption {
  ymd: string;
  label: string;
}

type Step = 1 | 2 | 3 | 4;

function shortDayLabel(date: Date, timezone: string, index: number): string {
  if (index === 0) return "Hoy";
  if (index === 1) return "Mañana";
  const raw = new Intl.DateTimeFormat("es-AR", { weekday: "short", timeZone: timezone }).format(date);
  const clean = raw.replace(/\.$/, "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function buildDayOptions(timezone: string): DayOption[] {
  return Array.from({ length: 5 }).map((_, i) => {
    const date = new Date(Date.now() + i * 86_400_000);
    return { ymd: dateKeyInTz(date, timezone), label: shortDayLabel(date, timezone, i) };
  });
}

export default function BookingClient({
  slug,
  businessName,
  timezone,
  services,
  professionals,
}: {
  slug: string;
  businessName: string;
  timezone: string;
  services: ServiceDTO[];
  professionals: ProfessionalDTO[];
}) {
  const [step, setStep] = useState<Step>(1);
  const [selectedService, setSelectedService] = useState<ServiceDTO | null>(null);
  const needsProfessional = professionals.length > 1;
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);

  const dayOptions = useMemo(() => buildDayOptions(timezone), [timezone]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [slotsByKey, setSlotsByKey] = useState<{ key: string; slots: string[] } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const [result, setResult] = useState<{ serviceName: string; dayLabel: string; time: string } | null>(null);

  const selectedDay = dayOptions[selectedDayIndex];
  const professionalChosen = !needsProfessional || !!selectedProfessionalId;
  const slotsKey =
    selectedService && selectedDay && professionalChosen
      ? `${selectedService.id}:${selectedDay.ymd}:${selectedProfessionalId ?? "any"}`
      : null;
  const slotsLoading = step === 2 && slotsKey !== null && slotsByKey?.key !== slotsKey;
  const slots = slotsByKey?.key === slotsKey ? slotsByKey.slots : [];

  useEffect(() => {
    if (step !== 2 || !selectedService || !selectedDay || !slotsKey) return;
    let cancelled = false;
    const professionalParam = selectedProfessionalId ? `&professionalId=${selectedProfessionalId}` : "";
    fetch(
      `/api/public/${slug}/availability?date=${selectedDay.ymd}&serviceId=${selectedService.id}${professionalParam}`,
    )
      .then((r) => r.json())
      .then((json: { data?: string[] }) => {
        if (!cancelled) setSlotsByKey({ key: slotsKey, slots: json.data ?? [] });
      })
      .catch(() => {
        if (!cancelled) setSlotsByKey({ key: slotsKey, slots: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [step, selectedService, selectedDay, selectedProfessionalId, slotsKey, slug]);

  function selectService(service: ServiceDTO) {
    setSelectedService(service);
    setSelectedProfessionalId(null);
    setSelectedDayIndex(0);
    setSelectedSlot(null);
    setServerError("");
    setStep(2);
  }

  function selectDay(index: number) {
    setSelectedDayIndex(index);
    setSelectedSlot(null);
  }

  function selectSlot(slot: string) {
    setSelectedSlot(slot);
    setServerError("");
    setStep(3);
  }

  async function confirmBooking() {
    if (!selectedService || !selectedDay || !selectedSlot || !name.trim() || !phone.trim()) return;
    setSubmitting(true);
    setServerError("");
    try {
      const startAt = zonedTimeToUtc(selectedDay.ymd, selectedSlot, timezone).toISOString();
      const res = await fetch(`/api/public/${slug}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          professionalId: selectedProfessionalId ?? undefined,
          startAt,
          name: name.trim(),
          phone: phone.trim(),
        }),
      });
      const json: { data?: { serviceName: string; dayLabel: string; time: string }; error?: string } =
        await res.json();
      if (!res.ok || !json.data) {
        setServerError(json.error ?? "No pudimos reservar el turno. Probá de nuevo.");
        return;
      }
      setResult(json.data);
      setStep(4);
    } catch {
      setServerError("No pudimos reservar el turno. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setStep(1);
    setSelectedService(null);
    setSelectedProfessionalId(null);
    setSelectedDayIndex(0);
    setSlotsByKey(null);
    setSelectedSlot(null);
    setName("");
    setPhone("");
    setServerError("");
    setResult(null);
  }

  return (
    <div className="flex flex-col gap-5 p-4 flex-1">
      <header className="flex flex-col gap-1 pb-3 border-b border-divider">
        <span className="text-[10px] tracking-[0.1em] uppercase text-accent">Reservar turno</span>
        <h1 className="font-heading font-extrabold text-xl leading-tight">{businessName}</h1>
        <p className="text-xs text-text/60">Sin necesidad de crear una cuenta</p>
      </header>

      {step === 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading font-bold text-sm text-text/70">Elegí un servicio</h2>
          {services.length === 0 && (
            <p className="text-sm text-text/60">Este negocio todavía no tiene servicios disponibles.</p>
          )}
          <div className="flex flex-col gap-2">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectService(s)}
                className="text-left w-full cursor-pointer"
              >
                <Card className="border border-transparent hover:border-accent transition-colors" elevated>
                  <CardTitle>{s.name}</CardTitle>
                  <CardBody>
                    {s.durationMinutes} min · {money(s.price)}
                  </CardBody>
                </Card>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && selectedService && (
        <section className="flex flex-col gap-4">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              Atrás
            </Button>
          </div>
          <h2 className="font-heading font-bold text-sm text-text/70">
            {needsProfessional ? `¿Con quién preferís? — ${selectedService.name}` : `Elegí día y horario — ${selectedService.name}`}
          </h2>

          {needsProfessional && (
            <div className="flex flex-wrap gap-2">
              {professionals.map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  variant={p.id === selectedProfessionalId ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => {
                    setSelectedProfessionalId(p.id);
                    setSelectedSlot(null);
                  }}
                >
                  {p.name}
                </Button>
              ))}
            </div>
          )}

          {professionalChosen && (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {dayOptions.map((day, i) => (
                  <Button
                    key={day.ymd}
                    type="button"
                    variant={i === selectedDayIndex ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => selectDay(i)}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {slotsLoading && <p className="text-sm text-text/60">Buscando horarios…</p>}
                {!slotsLoading && slots.length === 0 && (
                  <p className="text-sm text-text/60">No hay horarios disponibles para este día.</p>
                )}
                {!slotsLoading &&
                  slots.map((slot) => (
                    <Button
                      key={slot}
                      type="button"
                      variant={slot === selectedSlot ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => selectSlot(slot)}
                    >
                      {slot}
                    </Button>
                  ))}
              </div>
            </>
          )}
        </section>
      )}

      {step === 3 && selectedService && selectedDay && selectedSlot && (
        <section className="flex flex-col gap-4">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
              Atrás
            </Button>
          </div>
          <h2 className="font-heading font-bold text-sm text-text/70">Tus datos</h2>
          <Card elevated>
            <CardBody>
              {selectedService.name}
              {selectedProfessionalId && ` · ${professionals.find((p) => p.id === selectedProfessionalId)?.name}`} ·{" "}
              {selectedDay.label} {selectedSlot}
            </CardBody>
          </Card>
          <div className="flex flex-col gap-3">
            <FormField label="Nombre" htmlFor="booking-name" required>
              <Input
                id="booking-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
              />
            </FormField>
            <FormField label="Teléfono" htmlFor="booking-phone" required>
              <Input
                id="booking-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="11 1234 5678"
              />
            </FormField>
          </div>
          {serverError && <p className="text-xs text-accent-700">{serverError}</p>}
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => setStep(2)}>
              Atrás
            </Button>
            <Button
              variant="primary"
              block
              disabled={!name.trim() || !phone.trim() || submitting}
              onClick={confirmBooking}
            >
              {submitting ? "Reservando…" : "Confirmar reserva"}
            </Button>
          </div>
        </section>
      )}

      {step === 4 && result && (
        <section className="flex flex-col items-center gap-4 text-center py-6">
          <div className="size-14 rounded-full bg-accent-100 text-accent-800 flex items-center justify-center text-2xl">
            ✓
          </div>
          <h2 className="font-heading font-extrabold text-lg">¡Turno reservado!</h2>
          <p className="text-sm text-text/80">
            {result.serviceName} · {result.dayLabel} {result.time}
          </p>
          <p className="text-xs text-text/60">
            Te vamos a escribir por WhatsApp para confirmar y recordarte antes del turno.
          </p>
          <Button variant="primary" onClick={resetAll}>
            Reservar otro turno
          </Button>
        </section>
      )}
    </div>
  );
}
