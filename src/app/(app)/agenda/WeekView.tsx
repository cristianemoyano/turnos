"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/primitives/Badge";

type WeekDay = { date: string; isOpen: boolean; count: number };

export function WeekView({ startKey, todayKey, onSelectDay }: { startKey: string; todayKey: string; onSelectDay: (date: string) => void }) {
  const [days, setDays] = useState<WeekDay[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/agenda/week-summary?start=${startKey}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setDays(json.data);
      });
    return () => {
      cancelled = true;
    };
  }, [startKey]);

  if (!days) return <p className="p-5 text-sm opacity-60">Cargando...</p>;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain p-4">
      {days.map((d) => {
        const dateObj = new Date(d.date + "T00:00:00");
        const dayName = new Intl.DateTimeFormat("es-AR", { weekday: "short" }).format(dateObj);
        const dayNum = dateObj.getDate();
        const isToday = d.date === todayKey;
        return (
          <button
            key={d.date}
            type="button"
            onClick={() => onSelectDay(d.date)}
            className={`flex items-center gap-3 px-3.5 py-3 border text-left cursor-pointer ${isToday ? "border-accent" : "border-divider"}`}
          >
            <div className="w-10 flex-none text-center">
              <div className="text-[10px] uppercase opacity-60">{dayName}</div>
              <div className="font-heading font-extrabold text-lg">{dayNum}</div>
            </div>
            <div className="flex-1 min-w-0">
              {!d.isOpen ? (
                <span className="text-sm opacity-45">Cerrado</span>
              ) : (
                <span className="text-sm">
                  {d.count} {d.count === 1 ? "turno" : "turnos"}
                </span>
              )}
            </div>
            {isToday && <Badge variant="accent">Hoy</Badge>}
          </button>
        );
      })}
    </div>
  );
}
