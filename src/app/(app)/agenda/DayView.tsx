"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { minutesToTimeString, timeStringToMinutes } from "@/lib/format";
import { localMinutesInTz } from "@/lib/tz";
import { cn } from "@/lib/cn";
import { expandSegments } from "@/modules/agenda/segments";
import { buildDayRegions, regionLabel, whyDoesNotFit } from "@/modules/agenda/slot-fit";
import type { RawAppointment } from "./types";

const STATUS_TONE: Record<
  string,
  { label: string; wrap: string; rail: string; chip: string }
> = {
  pending: {
    label: "Pendiente",
    wrap: "bg-accent2-100 border-accent2-200 hover:bg-accent2-200/70",
    rail: "bg-accent2-500",
    chip: "bg-accent2-600 text-bg",
  },
  confirmed: {
    label: "Confirmado",
    wrap: "bg-accent-100 border-accent-200 hover:bg-accent-200/70",
    rail: "bg-accent",
    chip: "text-accent-800",
  },
  done: {
    label: "Atendido",
    wrap: "bg-neutral-100 border-neutral-200 hover:bg-neutral-200",
    rail: "bg-neutral-500",
    chip: "text-neutral-700",
  },
  cancelled: {
    label: "Cancelado",
    wrap: "bg-bg border-neutral-300 opacity-55",
    rail: "bg-neutral-400",
    chip: "text-text/50",
  },
};

const SLOT_MINUTES = 30;
const PX_PER_MINUTE = 1.46;
const NOW_TICK_MS = 30_000;
/** Hide a grid time label when it would sit on top of the now-line clock. */
const NOW_LABEL_GAP_MINUTES = 12;

function useNowMinutes(active: boolean, timezone: string): number | null {
  const [minutes, setMinutes] = useState<number | null>(() =>
    active ? localMinutesInTz(new Date(), timezone) : null,
  );

  useEffect(() => {
    if (!active) {
      setMinutes(null);
      return;
    }
    const tick = () => setMinutes(localMinutesInTz(new Date(), timezone));
    tick();
    const id = window.setInterval(tick, NOW_TICK_MS);
    return () => window.clearInterval(id);
  }, [active, timezone]);

  return minutes;
}

export type DayShift = { from: string; to: string };

export function DayView({
  isOpen,
  timezone,
  isToday,
  appointments,
  shifts,
  showCancelled,
  onOpenSlot,
  onOpenAppointment,
  onOpenBlock,
  isPastDay = false,
}: {
  isOpen: boolean;
  timezone: string;
  isToday: boolean;
  appointments: RawAppointment[];
  shifts: DayShift[];
  showCancelled: boolean;
  onOpenSlot: (time: string, overtime: boolean) => void;
  onOpenAppointment: (a: RawAppointment, stageLabel?: string) => void;
  onOpenBlock: (a: RawAppointment) => void;
  isPastDay?: boolean;
}) {
  const nowMinutes = useNowMinutes(isToday, timezone);
  const scrolledToNow = useRef(false);

  useEffect(() => {
    scrolledToNow.current = false;
  }, [isToday]);

  const nowMarkerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || scrolledToNow.current) return;
    scrolledToNow.current = true;
    node.scrollIntoView({ block: "center", inline: "nearest" });
  }, []);

  const visible = useMemo(() => {
    const rows = appointments.filter((a) => {
      if (a.kind === "block") return true;
      if (a.status === "cancelled") return showCancelled;
      return true;
    });
    return rows.sort((a, b) => {
      const aCancelled = a.kind === "appointment" && a.status === "cancelled";
      const bCancelled = b.kind === "appointment" && b.status === "cancelled";
      if (aCancelled === bCancelled) return 0;
      return aCancelled ? -1 : 1;
    });
  }, [appointments, showCancelled]);

  const orderedShifts = useMemo(
    () => [...shifts].sort((a, b) => timeStringToMinutes(a.from) - timeStringToMinutes(b.from)),
    [shifts],
  );

  const regions = useMemo(() => {
    const extras = visible.map((a) => {
      const start = localMinutesInTz(new Date(a.start_at), timezone);
      return { start, end: start + a.duration_minutes };
    });
    return buildDayRegions(orderedShifts, extras);
  }, [orderedShifts, visible, timezone]);

  if (!isOpen || orderedShifts.length === 0) {
    return <p className="p-5 text-sm opacity-60">El negocio está cerrado este día.</p>;
  }

  return (
    <div className="flex-1 overflow-auto pb-24 pt-3">
      {regions.map((region, i) => (
        <ShiftTrack
          key={`${region.kind}-${region.from}-${region.to}`}
          start={region.from}
          end={region.to}
          overtime={region.overtime}
          overtimeKind={region.kind}
          timezone={timezone}
          nowMinutes={nowMinutes}
          nowMarkerRef={nowMarkerRef}
          appointments={visible}
          shifts={orderedShifts}
          flushTop={i > 0}
          isPastDay={isPastDay}
          onOpenSlot={onOpenSlot}
          onOpenAppointment={onOpenAppointment}
          onOpenBlock={onOpenBlock}
        />
      ))}
    </div>
  );
}

function ShiftTrack({
  start,
  end,
  overtime,
  overtimeKind,
  timezone,
  nowMinutes,
  nowMarkerRef,
  appointments,
  shifts,
  flushTop,
  isPastDay,
  onOpenSlot,
  onOpenAppointment,
  onOpenBlock,
}: {
  start: number;
  end: number;
  overtime: boolean;
  overtimeKind: "hours" | "before" | "pausa" | "after";
  timezone: string;
  nowMinutes: number | null;
  nowMarkerRef: (node: HTMLDivElement | null) => void;
  appointments: RawAppointment[];
  shifts: DayShift[];
  flushTop: boolean;
  isPastDay: boolean;
  onOpenSlot: (time: string, overtime: boolean) => void;
  onOpenAppointment: (a: RawAppointment, stageLabel?: string) => void;
  onOpenBlock: (a: RawAppointment) => void;
}) {
  const height = Math.max(end - start, SLOT_MINUTES) * PX_PER_MINUTE;
  const caption = overtime ? regionLabel(overtimeKind) : null;

  const slots: number[] = [];
  for (let m = start; m + SLOT_MINUTES <= end; m += SLOT_MINUTES) slots.push(m);

  const ticks: number[] = [];
  for (let m = start; m < end; m += SLOT_MINUTES) ticks.push(m);

  const nowInShift = nowMinutes !== null && nowMinutes >= start && nowMinutes < end;

  return (
    <div className={cn("relative", overtime && "bg-neutral-100/90")} style={{ height }}>
      {ticks.map((h) => {
        const hourMark = h % 60 === 0;
        const hideLabel =
          nowInShift && nowMinutes !== null && Math.abs(h - nowMinutes) < NOW_LABEL_GAP_MINUTES;
        return (
          <div
            key={`h-${h}`}
            className="absolute left-0 right-0 flex items-start pointer-events-none z-[1]"
            style={{ top: (h - start) * PX_PER_MINUTE }}
          >
            <span
              className={cn(
                "w-12 flex-none pl-3 tabular-nums",
                hourMark ? "text-[10px] font-bold opacity-45" : "text-[9px] font-medium opacity-30",
                flushTop && h === start ? "translate-y-0.5" : "-translate-y-2",
                hideLabel && "opacity-0",
              )}
            >
              {minutesToTimeString(h)}
            </span>
            <div
              className={cn(
                "flex-1 border-t",
                hourMark ? "border-divider" : "border-divider/40",
                flushTop && h === start && "border-t-0",
              )}
            />
          </div>
        );
      })}

      {slots.map((m) => (
        <button
          key={`slot-${m}`}
          type="button"
          aria-label={
            isPastDay || (nowMinutes !== null && m < nowMinutes)
              ? `Registrar visita olvidada ${minutesToTimeString(m)}`
              : overtime
                ? `Crear sobreturno ${minutesToTimeString(m)}`
                : `Crear turno ${minutesToTimeString(m)}`
          }
          onClick={() => onOpenSlot(minutesToTimeString(m), overtime)}
          className={cn("absolute right-0 left-12 cursor-pointer", overtime ? "hover:bg-accent/8" : "hover:bg-accent/6")}
          style={{
            top: (m - start) * PX_PER_MINUTE,
            height: SLOT_MINUTES * PX_PER_MINUTE,
          }}
        />
      ))}

      {caption && (
        <div className="absolute left-12 right-2 top-0.5 z-[2] pointer-events-none">
          <span className="text-[10px] text-text/40">{caption} · sobreturno</span>
        </div>
      )}

      {appointments.flatMap((a) => {
        const aStart = localMinutesInTz(new Date(a.start_at), timezone);
        const overtimeAppt = whyDoesNotFit(shifts, minutesToTimeString(aStart), a.duration_minutes) != null;
        if (a.kind === "block") {
          const aEnd = aStart + a.duration_minutes;
          const topMin = Math.max(aStart, start);
          const bottomMin = Math.min(aEnd, end);
          if (bottomMin <= topMin) return [];
          return [
            <EventCard
              key={a.id}
              appointment={a}
              timezone={timezone}
              top={(topMin - start) * PX_PER_MINUTE}
              height={(bottomMin - topMin) * PX_PER_MINUTE}
              durationMinutes={bottomMin - topMin}
              overtime={overtimeAppt}
              onOpenAppointment={onOpenAppointment}
              onOpenBlock={onOpenBlock}
            />,
          ];
        }

        const pieces = expandSegments(a.duration_minutes, a.service?.segments);
        const hasWait = pieces.some((p) => p.type === "wait");
        if (!hasWait) {
          const aEnd = aStart + a.duration_minutes;
          const topMin = Math.max(aStart, start);
          const bottomMin = Math.min(aEnd, end);
          if (bottomMin <= topMin) return [];
          return [
            <EventCard
              key={a.id}
              appointment={a}
              timezone={timezone}
              top={(topMin - start) * PX_PER_MINUTE}
              height={(bottomMin - topMin) * PX_PER_MINUTE}
              durationMinutes={bottomMin - topMin}
              overtime={overtimeAppt}
              onOpenAppointment={onOpenAppointment}
              onOpenBlock={onOpenBlock}
            />,
          ];
        }

        return pieces.flatMap((piece, i) => {
          const pieceStart = aStart + piece.offsetMinutes;
          const pieceEnd = pieceStart + piece.durationMinutes;
          const topMin = Math.max(pieceStart, start);
          const bottomMin = Math.min(pieceEnd, end);
          if (bottomMin <= topMin) return [];
          const top = (topMin - start) * PX_PER_MINUTE;
          const height = (bottomMin - topMin) * PX_PER_MINUTE;
          if (piece.type === "wait") {
            return [
              <WaitBand
                key={`${a.id}-wait-${i}`}
                top={top}
                height={height}
                label={piece.label}
                clientName={a.client?.name}
              />,
            ];
          }
          return [
            <EventCard
              key={`${a.id}-work-${i}`}
              appointment={a}
              timezone={timezone}
              top={top}
              height={height}
              durationMinutes={bottomMin - topMin}
              overtime={overtimeAppt}
              isContinuation={piece.offsetMinutes > 0}
              stageLabel={piece.label}
              pieceStartMinutes={pieceStart}
              onOpenAppointment={onOpenAppointment}
              onOpenBlock={onOpenBlock}
            />,
          ];
        });
      })}

      {nowInShift && nowMinutes !== null && (
        <NowMarker
          offsetPx={(nowMinutes - start) * PX_PER_MINUTE}
          label={minutesToTimeString(nowMinutes)}
          onMount={nowMarkerRef}
        />
      )}
    </div>
  );
}

function NowMarker({
  offsetPx,
  label,
  onMount,
}: {
  offsetPx: number;
  label: string;
  onMount: (node: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={onMount}
      data-now-marker
      role="img"
      aria-label={`Hora actual ${label}`}
      className="absolute left-0 right-0 z-30 pointer-events-none"
      style={{ top: offsetPx }}
    >
      <span className="absolute left-0 w-12 -translate-y-1/2 pl-2 text-[10px] font-bold tabular-nums leading-none text-accent">
        {label}
      </span>
      <span className="absolute left-12 top-0 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-bg" />
      <span className="absolute left-12 right-0 top-0 h-0.5 -translate-y-1/2 bg-accent" />
    </div>
  );
}

function WaitBand({
  top,
  height,
  label,
  clientName,
}: {
  top: number;
  height: number;
  label: string;
  clientName?: string | null;
}) {
  const visualHeight = Math.max(height - 2, 18);
  return (
    <div
      className="absolute left-12 right-2 z-[2] pointer-events-none overflow-hidden border border-dashed border-divider bg-neutral-100/80 px-2 py-0.5"
      style={{ top, height: visualHeight }}
    >
      <span className="text-xs font-semibold text-text/45 truncate leading-tight block">
        Espera{label ? ` · ${label}` : ""}
      </span>
      {visualHeight >= 34 && clientName && (
        <span className="text-[12px] text-text/40 truncate leading-tight block">{clientName}</span>
      )}
    </div>
  );
}

function EventCard({
  appointment: a,
  timezone,
  top,
  height,
  durationMinutes,
  overtime = false,
  isContinuation = false,
  stageLabel,
  pieceStartMinutes,
  onOpenAppointment,
  onOpenBlock,
}: {
  appointment: RawAppointment;
  timezone: string;
  top: number;
  height: number;
  durationMinutes: number;
  overtime?: boolean;
  isContinuation?: boolean;
  stageLabel?: string;
  pieceStartMinutes?: number;
  onOpenAppointment: (a: RawAppointment, stageLabel?: string) => void;
  onOpenBlock: (a: RawAppointment) => void;
}) {
  const startMinutes =
    pieceStartMinutes ?? localMinutesInTz(new Date(a.start_at), timezone);
  const time = minutesToTimeString(startMinutes);
  const endTime = minutesToTimeString(startMinutes + durationMinutes);
  const timeRange = `${time}–${endTime}`;
  const visualHeight = Math.max(height - 2, 22);
  const showTime = visualHeight >= 36;
  const showMeta = visualHeight >= 54;

  if (a.kind === "block") {
    return (
      <button
        type="button"
        onClick={() => onOpenBlock(a)}
        aria-label={`Bloqueado ${timeRange}${a.reason ? ` · ${a.reason}` : ""}`}
        className="absolute left-12 right-2 z-10 overflow-hidden text-left cursor-pointer bg-neutral-200 border border-neutral-300 hover:bg-neutral-300/80 flex"
        style={{ top, height: visualHeight }}
      >
        <span className="w-[3px] flex-none self-stretch bg-neutral-600" />
        <span className="min-w-0 flex-1 px-2 py-1 flex flex-col justify-start">
          <span className="text-sm font-semibold leading-tight truncate text-text/70">Bloqueado</span>
          {showTime && (
            <span className="text-[13px] tabular-nums leading-tight text-text/50">{timeRange}</span>
          )}
          {showMeta && a.reason && (
            <span className="text-[13px] leading-tight truncate text-text/50">{a.reason}</span>
          )}
        </span>
      </button>
    );
  }

  const tone = STATUS_TONE[a.status] ?? STATUS_TONE.confirmed;
  const clientName = a.client?.name || "Sin cliente";
  const title = stageLabel ? `${clientName} - ${stageLabel}` : clientName;
  const meta = isContinuation
    ? clientName
    : [a.service?.name, overtime ? "Sobreturno" : null, a.source === "online" ? "Online" : null]
        .filter(Boolean)
        .join(" · ");
  const compactExtra = !isContinuation && !showMeta && overtime ? "Sobreturno" : "";

  return (
    <button
      type="button"
      onClick={() => onOpenAppointment(a, stageLabel)}
      aria-label={`${title} ${timeRange}${a.service?.name ? ` · ${a.service.name}` : ""}${overtime ? " · Sobreturno" : ""} · ${tone.label}`}
      className={cn("absolute left-12 right-2 z-10 overflow-hidden text-left cursor-pointer border flex", tone.wrap)}
      style={{ top, height: visualHeight }}
    >
      <span className={cn("w-[3px] flex-none self-stretch", tone.rail)} />
      <span className="min-w-0 flex-1 px-2 py-1 flex flex-col justify-start">
        <span className="flex items-start justify-between gap-1 min-w-0">
          <span
            className={cn(
              "text-sm font-semibold leading-tight truncate",
              a.status === "cancelled" && "line-through",
            )}
          >
            {title}
          </span>
          <span
            className={cn(
              "shrink-0 text-[10px] font-bold leading-tight tracking-[0.02em] px-1.5 py-0.5",
              tone.chip,
            )}
          >
            {tone.label}
          </span>
        </span>
        {showTime && (
          <span className="text-[13px] tabular-nums leading-tight text-text/60 truncate">
            {timeRange}
            {compactExtra ? ` · ${compactExtra}` : ""}
          </span>
        )}
        {showMeta && meta && (
          <span className="text-[13px] leading-tight truncate text-text/60">{meta}</span>
        )}
      </span>
    </button>
  );
}
