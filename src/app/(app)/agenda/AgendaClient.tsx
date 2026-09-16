"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/primitives/Badge";
import { Button } from "@/components/primitives/Button";
import { money } from "@/lib/format";
import { dateLabelInTz } from "@/lib/tz";
import { DayView } from "./DayView";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { AppointmentSheet } from "./AppointmentSheet";
import { NewAppointmentSheet } from "./NewAppointmentSheet";
import type { Professional, RawAppointment, SheetState } from "./types";

type ViewMode = "day" | "week" | "month";

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function shiftMonth(dateKey: string, months: number): string {
  const [y, m] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export default function AgendaClient({ timezone, todayKey }: { timezone: string; todayKey: string }) {
  const [view, setView] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [professionalFilter, setProfessionalFilter] = useState<string>("all");
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<RawAppointment[]>([]);
  const [freeTimes, setFreeTimes] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [sheet, setSheet] = useState<SheetState>(null);

  const refresh = useCallback(() => {
    fetch(`/api/v1/appointments?date=${selectedDate}`)
      .then((r) => r.json())
      .then((json) => setAppointments(json.data ?? []));
    fetch(`/api/v1/agenda/availability?date=${selectedDate}`)
      .then((r) => r.json())
      .then((json) => {
        setFreeTimes(json.data?.times ?? []);
        setProfessionals(json.data?.professionals ?? []);
      });
    fetch(`/api/v1/agenda/week-summary?start=${selectedDate}`)
      .then((r) => r.json())
      .then((json) => setIsOpen(json.data?.[0]?.isOpen ?? true));
  }, [selectedDate]);

  useEffect(() => {
    if (view === "day") refresh();
  }, [view, refresh]);

  const filteredAppointments =
    professionalFilter === "all" ? appointments : appointments.filter((a) => a.professional_id === professionalFilter);

  const confirmedCount = appointments.filter((a) => a.kind === "appointment" && a.status !== "cancelled").length;
  const cancelledCount = appointments.filter((a) => a.kind === "appointment" && a.status === "cancelled").length;
  // Revenue only counts appointments the client has actually confirmed (or
  // already attended) — a pending booking isn't guaranteed money yet.
  const revenue = appointments
    .filter((a) => a.kind === "appointment" && (a.status === "confirmed" || a.status === "done"))
    .reduce((sum, a) => sum + Number(a.price ?? 0), 0);

  function navigate(delta: 1 | -1) {
    if (view === "day") setSelectedDate((d) => addDays(d, delta));
    else if (view === "week") setSelectedDate((d) => addDays(d, delta * 7));
    else setSelectedDate((d) => shiftMonth(d, delta));
  }

  const navLabel =
    view === "day"
      ? selectedDate === todayKey
        ? "Hoy"
        : dateLabelInTz(new Date(selectedDate + "T12:00:00"), timezone)
      : view === "week"
        ? `Semana del ${dateLabelInTz(new Date(selectedDate + "T12:00:00"), timezone)}`
        : new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
            new Date(selectedDate + "T12:00:00Z"),
          );

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div className="flex-none px-5 pt-4 pb-3 border-b-2 border-divider">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => navigate(-1)}
            className="size-8 flex-none flex items-center justify-center border border-divider cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h2 className="text-base font-heading font-extrabold capitalize truncate">{navLabel}</h2>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={() => navigate(1)}
            className="size-8 flex-none flex items-center justify-center border border-divider cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
        {selectedDate !== todayKey && (
          <button
            type="button"
            onClick={() => setSelectedDate(todayKey)}
            className="mt-1.5 text-xs text-accent underline underline-offset-2 cursor-pointer"
          >
            Volver a hoy
          </button>
        )}
        <div className="flex gap-1.5 mt-2.5">
          <Button variant={view === "day" ? "primary" : "secondary"} size="sm" block onClick={() => setView("day")}>
            Día
          </Button>
          <Button variant={view === "week" ? "primary" : "secondary"} size="sm" block onClick={() => setView("week")}>
            Semana
          </Button>
          <Button variant={view === "month" ? "primary" : "secondary"} size="sm" block onClick={() => setView("month")}>
            Mes
          </Button>
        </div>
        {view === "day" && (
          <>
            <div className="flex gap-1.5 mt-2.5 flex-wrap">
              <Badge variant="accent">{confirmedCount} turnos</Badge>
              <Badge variant="neutral">{money(revenue)}</Badge>
              {cancelledCount > 0 && <Badge variant="outline">{cancelledCount} cancelado</Badge>}
            </div>
            {professionals.length > 1 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setProfessionalFilter("all")}
                  className={`text-xs px-2.5 py-1 border cursor-pointer ${professionalFilter === "all" ? "bg-accent text-bg border-accent" : "border-divider"}`}
                >
                  Todos
                </button>
                {professionals.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProfessionalFilter(p.id)}
                    className={`text-xs px-2.5 py-1 border cursor-pointer ${professionalFilter === p.id ? "bg-accent text-bg border-accent" : "border-divider"}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {view === "day" && (
        <DayView
          isOpen={isOpen}
          timezone={timezone}
          isToday={selectedDate === todayKey}
          appointments={filteredAppointments}
          freeTimes={freeTimes}
          onOpenSlot={(time) => setSheet({ type: "slot", time })}
          onOpenAppointment={(a) => setSheet({ type: "appointment", appointment: a })}
          onOpenBlock={(a) => setSheet({ type: "block", appointment: a })}
        />
      )}
      {view === "week" && (
        <WeekView
          startKey={selectedDate}
          todayKey={todayKey}
          onSelectDay={(d) => {
            setSelectedDate(d);
            setView("day");
          }}
        />
      )}
      {view === "month" && (
        <MonthView
          monthKey={selectedDate.slice(0, 7)}
          todayKey={todayKey}
          onSelectDay={(d) => {
            setSelectedDate(d);
            setView("day");
          }}
        />
      )}

      {view === "day" && (
        <button
          type="button"
          onClick={() => setSheet({ type: "new" })}
          aria-label="Nuevo turno"
          className="absolute right-4.5 bottom-22 size-13 rounded-full bg-accent text-bg flex items-center justify-center shadow-[var(--shadow-lg)] cursor-pointer z-10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      <AppointmentSheet
        sheet={sheet?.type !== "new" ? sheet : null}
        onClose={() => setSheet(null)}
        onCreateAtSlot={(time) => setSheet({ type: "new", presetTime: time })}
        onChanged={refresh}
        selectedDate={selectedDate}
        timezone={timezone}
      />
      <NewAppointmentSheet
        open={sheet?.type === "new"}
        onClose={() => setSheet(null)}
        onCreated={refresh}
        todayKey={todayKey}
        initialDate={selectedDate}
        presetTime={sheet?.type === "new" ? sheet.presetTime : undefined}
        professionals={professionals}
        timezone={timezone}
      />
    </div>
  );
}
