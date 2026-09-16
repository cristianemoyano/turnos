"use client";

import { useMemo } from "react";
import { Badge } from "@/components/primitives/Badge";
import { money, minutesToTimeString } from "@/lib/format";
import { localMinutesInTz } from "@/lib/tz";
import type { RawAppointment } from "./types";

const STATUS_BADGE: Record<string, { label: string; variant: "accent" | "accent2" | "neutral" | "outline" }> = {
  pending: { label: "Pendiente", variant: "accent2" },
  confirmed: { label: "Confirmado", variant: "accent" },
  done: { label: "Atendido", variant: "neutral" },
  cancelled: { label: "Cancelado", variant: "outline" },
};

type Row =
  | { type: "free"; time: string; minutes: number }
  | { type: "appt"; appointment: RawAppointment; minutes: number }
  | { type: "now"; minutes: number };

export function DayView({
  isOpen,
  timezone,
  isToday,
  appointments,
  freeTimes,
  onOpenSlot,
  onOpenAppointment,
  onOpenBlock,
}: {
  isOpen: boolean;
  timezone: string;
  isToday: boolean;
  appointments: RawAppointment[];
  freeTimes: string[];
  onOpenSlot: (time: string) => void;
  onOpenAppointment: (a: RawAppointment) => void;
  onOpenBlock: (a: RawAppointment) => void;
}) {
  const nowMinutes = useMemo(() => (isToday ? localMinutesInTz(new Date(), timezone) : null), [isToday, timezone]);

  if (!isOpen) {
    return <p className="p-5 text-sm opacity-60">El negocio está cerrado este día.</p>;
  }

  const rows: Row[] = [
    ...freeTimes.map((time) => ({ type: "free" as const, time, minutes: toMinutes(time) })),
    ...appointments
      .filter((a) => a.status !== "cancelled" || a.kind === "appointment")
      .map((a) => ({ type: "appt" as const, appointment: a, minutes: localMinutesInTz(new Date(a.start_at), timezone) })),
  ];
  if (nowMinutes !== null) rows.push({ type: "now", minutes: nowMinutes });
  rows.sort((a, b) => a.minutes - b.minutes);

  return (
    <div className="flex-1 overflow-auto pb-24">
      {rows.length === 0 && <p className="p-5 text-sm opacity-60">Sin horarios disponibles este día.</p>}
      {rows.map((row, i) => {
        if (row.type === "now") {
          return (
            <div key={`now-${i}`} className="flex items-center gap-2 px-5 pointer-events-none">
              <span className="w-10 flex-none text-[10px] font-bold text-accent">{minutesToTimeString(row.minutes)}</span>
              <div className="flex-1 h-0.5 bg-accent relative">
                <span className="absolute -left-1 -top-[3px] size-2 rounded-full bg-accent" />
              </div>
            </div>
          );
        }

        if (row.type === "free") {
          return (
            <button
              key={`free-${row.time}`}
              type="button"
              onClick={() => onOpenSlot(row.time)}
              className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-divider text-left cursor-pointer"
            >
              <div className="w-12 flex-none font-heading font-extrabold text-sm">{row.time}</div>
              <span className="flex-1 text-sm opacity-45">Disponible</span>
              <span className="opacity-30 text-lg">+</span>
            </button>
          );
        }

        const a = row.appointment;
        const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(
          new Date(a.start_at),
        );

        if (a.kind === "block") {
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onOpenBlock(a)}
              className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-divider text-left cursor-pointer"
            >
              <div className="w-12 flex-none font-heading font-extrabold text-sm">{time}</div>
              <span className="flex-1 text-sm opacity-70">Bloqueado{a.reason ? ` · ${a.reason}` : ""}</span>
            </button>
          );
        }

        const badge = STATUS_BADGE[a.status];
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onOpenAppointment(a)}
            className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-divider text-left cursor-pointer"
          >
            <div className="w-12 flex-none font-heading font-extrabold text-sm">{time}</div>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-sm font-semibold ${a.status === "cancelled" ? "line-through opacity-55" : ""}`}>
                  {a.client?.name}
                </span>
                {a.source === "online" && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-px">
                    Online
                  </Badge>
                )}
                {a.deposit_required && (
                  <Badge variant={a.deposit_paid ? "accent" : "outline"} className="text-[9px] px-1.5 py-px">
                    {a.deposit_paid ? "Seña pagada" : "Seña pendiente"}
                  </Badge>
                )}
              </div>
              <span className="text-xs opacity-65">
                {a.service?.name} · {a.duration_minutes} min · {money(a.price)}
              </span>
            </div>
            {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
