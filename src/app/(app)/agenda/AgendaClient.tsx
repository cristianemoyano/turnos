"use client";

import { useCallback, useEffect, useState } from "react";
import { Fab } from "@/components/layout/Fab";
import { Badge } from "@/components/primitives/Badge";
import { Button } from "@/components/primitives/Button";
import { Select } from "@/components/primitives/Select";
import { money } from "@/lib/format";
import { dateLabelInTz } from "@/lib/tz";
import { DayView } from "./DayView";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { AppointmentSheet } from "./AppointmentSheet";
import { NewAppointmentSheet } from "./NewAppointmentSheet";
import type { DayShift, Professional, RawAppointment, SheetState, AgendaBusinessInfo } from "./types";

const PROFESSIONAL_STORAGE_KEY = "turnos.agenda.professionalId";

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

function weekdayForDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export default function AgendaClient({
  timezone,
  todayKey,
  businessInfo,
}: {
  timezone: string;
  todayKey: string;
  businessInfo: AgendaBusinessInfo;
}) {
  const [view, setView] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [professionalFilter, setProfessionalFilter] = useState<string>("");
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<RawAppointment[]>([]);
  const [hoursRows, setHoursRows] = useState<{ day_of_week: string; is_open: boolean; shifts: DayShift[] }[]>([]);
  const [hoursReady, setHoursReady] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [sheet, setSheet] = useState<SheetState>(null);

  useEffect(() => {
    fetch("/api/v1/business-hours")
      .then((r) => r.json())
      .then((json) => setHoursRows(json.data ?? []))
      .finally(() => setHoursReady(true));
  }, []);

  const refresh = useCallback(() => {
    fetch(`/api/v1/appointments?date=${selectedDate}`)
      .then((r) => r.json())
      .then((json) => setAppointments(json.data ?? []));
    const availabilityUrl = professionalFilter
      ? `/api/v1/agenda/availability?date=${selectedDate}&professionalId=${professionalFilter}`
      : `/api/v1/agenda/availability?date=${selectedDate}`;
    fetch(availabilityUrl)
      .then((r) => r.json())
      .then((json) => {
        setProfessionals(json.data?.professionals ?? []);
      });
    fetch(`/api/v1/agenda/week-summary?start=${selectedDate}`)
      .then((r) => r.json())
      .then((json) => setIsOpen(json.data?.[0]?.isOpen ?? true));
  }, [selectedDate, professionalFilter]);

  useEffect(() => {
    if (view === "day") refresh();
  }, [view, refresh]);

  // Multi-pro day view is always one person at a time — a combined "Todos"
  // grid duplicates the same clock times across stylists and is unreadable.
  // Restore the last pick when it still exists; otherwise land on the first.
  useEffect(() => {
    if (professionals.length <= 1) return;
    const stored = typeof window !== "undefined" ? localStorage.getItem(PROFESSIONAL_STORAGE_KEY) : null;
    const valid =
      (professionalFilter && professionals.some((p) => p.id === professionalFilter) && professionalFilter) ||
      (stored && professionals.some((p) => p.id === stored) && stored) ||
      professionals[0]?.id;
    if (valid && valid !== professionalFilter) {
      setProfessionalFilter(valid);
    }
  }, [professionals, professionalFilter]);

  function selectProfessional(id: string) {
    setProfessionalFilter(id);
    try {
      localStorage.setItem(PROFESSIONAL_STORAGE_KEY, id);
    } catch {
      /* ignore quota / private mode */
    }
  }

  // Business-wide rows (professional_id null — a "Todos" block, or any row
  // from a single-professional business) always show for the selected person,
  // since they occupy that professional's time too.
  const filteredAppointments =
    !professionalFilter || professionals.length <= 1
      ? appointments
      : appointments.filter((a) => a.professional_id === null || a.professional_id === professionalFilter);

  const visibleAppointments = filteredAppointments.filter((a) => a.kind === "appointment");
  const pendingCount = visibleAppointments.filter((a) => a.status === "pending").length;
  const cancelledCount = visibleAppointments.filter((a) => a.status === "cancelled").length;
  const activeCount = visibleAppointments.filter((a) => a.status !== "cancelled").length;
  // Revenue only counts appointments the client has actually confirmed (or
  // already attended) — a pending booking isn't guaranteed money yet.
  const revenue = visibleAppointments
    .filter((a) => a.status === "confirmed" || a.status === "done")
    .reduce((sum, a) => sum + Number(a.price ?? 0), 0);

  const needsProfessionalPicker = professionals.length > 1;
  const selectedProfessionalId = needsProfessionalPicker ? professionalFilter || null : null;
  const dayHours = hoursRows.find((h) => h.day_of_week === weekdayForDateKey(selectedDate));
  const dayShifts = dayHours?.is_open ? (dayHours.shifts ?? []) : [];
  const dayIsOpen = (dayHours?.is_open ?? isOpen) && dayShifts.length > 0;

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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b-2 border-divider bg-bg px-5 pb-3 pt-4">
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
            {needsProfessionalPicker && (
              <div className="mt-2.5">
                <Select
                  aria-label="Profesional"
                  value={professionalFilter}
                  onChange={(e) => selectProfessional(e.target.value)}
                  options={professionals.map((p) => ({ value: p.id, label: p.name || "Sin nombre" }))}
                />
              </div>
            )}
            <div className="flex gap-1.5 mt-2.5 flex-wrap">
              <Badge variant="accent">{activeCount} {activeCount === 1 ? "turno" : "turnos"}</Badge>
              {pendingCount > 0 && (
                <Badge variant="accent2">
                  {pendingCount} {pendingCount === 1 ? "pendiente" : "pendientes"}
                </Badge>
              )}
              <Badge variant="neutral">{money(revenue)}</Badge>
              {cancelledCount > 0 && (
                <button
                  type="button"
                  aria-pressed={showCancelled}
                  aria-label={showCancelled ? "Ocultar cancelados" : "Ver cancelados"}
                  onClick={() => setShowCancelled((v) => !v)}
                  className="cursor-pointer"
                >
                  <Badge variant={showCancelled ? "accent" : "outline"}>
                    {cancelledCount} {cancelledCount === 1 ? "cancelado" : "cancelados"}
                    {showCancelled ? "" : " · ver"}
                  </Badge>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {view === "day" && (professionals.length <= 1 || professionalFilter) && (
        hoursReady ? (
          <DayView
            isOpen={dayIsOpen}
            timezone={timezone}
            isToday={selectedDate === todayKey}
            appointments={filteredAppointments}
            shifts={dayShifts}
            showCancelled={showCancelled}
            onOpenSlot={(time, overtime) => setSheet({ type: "slot", time, overtime })}
            onOpenAppointment={(a, stageLabel) => setSheet({ type: "appointment", appointment: a, stageLabel })}
            onOpenBlock={(a) => setSheet({ type: "block", appointment: a })}
            isPastDay={selectedDate < todayKey}
          />
        ) : (
          <p className="p-5 text-sm opacity-60">Cargando horarios…</p>
        )
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

      {view === "day" && <Fab aria-label="Nuevo turno" onClick={() => setSheet({ type: "new" })} />}

      <AppointmentSheet
        sheet={sheet?.type !== "new" ? sheet : null}
        onClose={() => setSheet(null)}
        onCreateAtSlot={(time, overtime, forgotten) =>
          setSheet({ type: "new", presetTime: time, overtime, forgotten })
        }
        onChanged={refresh}
        selectedDate={selectedDate}
        todayKey={todayKey}
        timezone={timezone}
        professionals={professionals}
        selectedProfessionalId={selectedProfessionalId}
        businessInfo={businessInfo}
      />
      <NewAppointmentSheet
        open={sheet?.type === "new"}
        onClose={() => setSheet(null)}
        onCreated={refresh}
        todayKey={todayKey}
        initialDate={selectedDate}
        presetTime={sheet?.type === "new" ? sheet.presetTime : undefined}
        presetOvertime={sheet?.type === "new" ? Boolean(sheet.overtime) : false}
        forgottenVisit={sheet?.type === "new" ? Boolean(sheet.forgotten) : false}
        professionals={professionals}
        timezone={timezone}
        presetProfessionalId={selectedProfessionalId}
        hoursRows={hoursRows}
        businessInfo={businessInfo}
      />
    </div>
  );
}
