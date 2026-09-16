"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const WEEKDAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

export function MonthView({ monthKey, todayKey, onSelectDay }: { monthKey: string; todayKey: string; onSelectDay: (date: string) => void }) {
  const [days, setDays] = useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/agenda/month-summary?month=${monthKey}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setDays(new Set<string>(json.data.days));
      });
    return () => {
      cancelled = true;
    };
  }, [monthKey]);

  const [y, m] = monthKey.split("-").map(Number);
  const firstOfMonth = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const leadingBlanks = (firstOfMonth.getUTCDay() + 6) % 7; // convert Sun=0 to Mon-first index

  const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(firstOfMonth);

  const cells: { key: string; label: string; dateKey?: string }[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push({ key: `b${i}`, label: "" });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${monthKey}-${String(d).padStart(2, "0")}`;
    cells.push({ key: dateKey, label: String(d), dateKey });
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="text-sm font-semibold mb-2.5 capitalize">{monthLabel}</div>
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {WEEKDAY_LETTERS.map((l, i) => (
          <div key={i} className="text-center text-[10px] opacity-50">
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) => {
          if (!c.dateKey) return <div key={c.key} />;
          const isToday = c.dateKey === todayKey;
          const hasDot = days?.has(c.dateKey);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onSelectDay(c.dateKey!)}
              className={cn(
                "aspect-square flex flex-col items-center justify-center gap-0.5 cursor-pointer border border-divider",
                isToday && "bg-accent text-bg font-bold border-accent",
              )}
            >
              <span className="text-xs">{c.label}</span>
              {hasDot && <span className={cn("size-1 rounded-full", isToday ? "bg-bg" : "bg-accent")} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
