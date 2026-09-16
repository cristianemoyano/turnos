"use client";

import { Input } from "@/components/primitives/Input";
import { Checkbox } from "@/components/primitives/Checkbox";
import { Button } from "@/components/primitives/Button";
import { DAY_LABELS } from "./types";
import type { DayHoursDraft } from "./types";

export function StepHorarios({ hours, setHours }: { hours: DayHoursDraft[]; setHours: (h: DayHoursDraft[]) => void }) {
  function updateDay(idx: number, patch: Partial<DayHoursDraft>) {
    const next = [...hours];
    next[idx] = { ...next[idx], ...patch };
    setHours(next);
  }

  return (
    <div className="flex flex-col gap-1">
      {hours.map((day, idx) => (
        <div key={day.day_of_week} className="py-3 border-b border-divider flex flex-col gap-2">
          <Checkbox
            label={DAY_LABELS[day.day_of_week]}
            checked={day.is_open}
            onCheckedChange={(checked) =>
              updateDay(idx, {
                is_open: checked,
                shifts: checked && day.shifts.length === 0 ? [{ from: "09:00", to: "19:00" }] : day.shifts,
              })
            }
          />
          {day.is_open ? (
            <>
              {day.shifts.map((sh, shIdx) => (
                <div key={shIdx} className="flex items-center gap-2 pl-6">
                  <Input
                    type="time"
                    value={sh.from}
                    onChange={(e) => {
                      const shifts = [...day.shifts];
                      shifts[shIdx] = { ...sh, from: e.target.value };
                      updateDay(idx, { shifts });
                    }}
                    className="flex-1"
                  />
                  <span className="text-xs opacity-40">a</span>
                  <Input
                    type="time"
                    value={sh.to}
                    onChange={(e) => {
                      const shifts = [...day.shifts];
                      shifts[shIdx] = { ...sh, to: e.target.value };
                      updateDay(idx, { shifts });
                    }}
                    className="flex-1"
                  />
                  {day.shifts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Quitar turno"
                      onClick={() => updateDay(idx, { shifts: day.shifts.filter((_, i) => i !== shIdx) })}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                className="self-start pl-6"
                onClick={() => updateDay(idx, { shifts: [...day.shifts, { from: "", to: "" }] })}
              >
                + Agregar turno
              </Button>
            </>
          ) : (
            <span className="text-sm opacity-45 pl-6">Cerrado</span>
          )}
        </div>
      ))}
    </div>
  );
}
