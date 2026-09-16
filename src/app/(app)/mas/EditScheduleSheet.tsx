"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/primitives/Sheet";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { Checkbox } from "@/components/primitives/Checkbox";

type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type Shift = { from: string; to: string };
type DayRow = { day_of_week: Weekday; is_open: boolean; shifts: Shift[] };

const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS: Record<Weekday, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};

function withDefaults(rows: DayRow[]): DayRow[] {
  const byDay = new Map(rows.map((r) => [r.day_of_week, r]));
  return WEEKDAYS.map((d) => byDay.get(d) ?? { day_of_week: d, is_open: false, shifts: [] });
}

export function EditScheduleSheet({
  hours,
  open,
  onOpenChange,
  onSaved,
}: {
  hours: DayRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [days, setDays] = useState<DayRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function sync() {
      await Promise.resolve();
      if (cancelled) return;
      setDays(withDefaults(hours).map((d) => ({ ...d, shifts: d.shifts.map((s) => ({ ...s })) })));
    }
    sync();
    return () => {
      cancelled = true;
    };
  }, [open, hours]);

  function updateDay(day: Weekday, patch: Partial<DayRow>) {
    setDays((prev) => prev.map((d) => (d.day_of_week === day ? { ...d, ...patch } : d)));
  }

  function updateShift(day: Weekday, idx: number, patch: Partial<Shift>) {
    setDays((prev) =>
      prev.map((d) =>
        d.day_of_week === day
          ? { ...d, shifts: d.shifts.map((s, i) => (i === idx ? { ...s, ...patch } : s)) }
          : d,
      ),
    );
  }

  function addShift(day: Weekday) {
    setDays((prev) =>
      prev.map((d) =>
        d.day_of_week === day ? { ...d, shifts: [...d.shifts, { from: "09:00", to: "18:00" }] } : d,
      ),
    );
  }

  function removeShift(day: Weekday, idx: number) {
    setDays((prev) =>
      prev.map((d) => (d.day_of_week === day ? { ...d, shifts: d.shifts.filter((_, i) => i !== idx) } : d)),
    );
  }

  async function submit() {
    setSaving(true);
    try {
      await fetch("/api/v1/business-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <h3 className="text-xl">Horarios de atención</h3>
      <div className="flex flex-col gap-3">
        {days.map((d) => (
          <div key={d.day_of_week} className="flex flex-col gap-2 bg-surface p-3">
            <Checkbox
              checked={d.is_open}
              onCheckedChange={(checked) => updateDay(d.day_of_week, { is_open: checked })}
              label={DAY_LABELS[d.day_of_week]}
            />
            {d.is_open && (
              <div className="flex flex-col gap-1.5 pl-6">
                {d.shifts.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <Input
                      type="time"
                      className="flex-1"
                      value={s.from}
                      onChange={(e) => updateShift(d.day_of_week, idx, { from: e.target.value })}
                    />
                    <span className="text-xs opacity-60">a</span>
                    <Input
                      type="time"
                      className="flex-1"
                      value={s.to}
                      onChange={(e) => updateShift(d.day_of_week, idx, { to: e.target.value })}
                    />
                    <button
                      type="button"
                      aria-label="Quitar turno"
                      onClick={() => removeShift(d.day_of_week, idx)}
                      className="size-8 flex-none flex items-center justify-center text-accent cursor-pointer"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="self-start" onClick={() => addShift(d.day_of_week)}>
                  + Agregar turno
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <Button variant="primary" block onClick={submit} disabled={saving}>
        {saving ? "Guardando..." : "Guardar"}
      </Button>
    </Sheet>
  );
}
