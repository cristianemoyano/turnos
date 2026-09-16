import { longestShiftMinutes } from "@/modules/agenda/slot-fit";

export type WantedSlotInfo =
  | { time: string; available: true }
  | {
      time: string;
      available: false;
      reason: "closed" | "outside_hours" | "does_not_fit" | "past" | "busy";
      shiftTo?: string;
    };

export function wantedSlotMessage(
  wanted: WantedSlotInfo | null | undefined,
  serviceName: string,
  durationMinutes: number,
  allowOvertime = false,
): string | null {
  if (!wanted || wanted.available) return null;
  switch (wanted.reason) {
    case "closed":
      return "El local está cerrado este día.";
    case "outside_hours":
      return allowOvertime
        ? `${wanted.time} está fuera del horario de atención. Podés agendarlo como sobreturno si el profesional está de acuerdo.`
        : `${wanted.time} está fuera del horario de atención.`;
    case "does_not_fit":
      return allowOvertime
        ? `${serviceName} dura ${durationMinutes} min y a las ${wanted.time} se pasa de las ${wanted.shiftTo}. Confirmá el sobreturno para atender igual.`
        : `${serviceName} dura ${durationMinutes} min y a las ${wanted.time} no llega a terminar antes de las ${wanted.shiftTo}. Elegí un horario más temprano u otro día.`;
    case "past":
      return `${wanted.time} ya pasó. Elegí un horario posterior.`;
    case "busy":
      return `${wanted.time} no tiene ${durationMinutes} min libres. Elegí otro horario.`;
  }
}

export function emptyDayMessage(
  closed: boolean,
  serviceName: string,
  durationMinutes: number,
  shifts: { from: string; to: string }[],
): string {
  if (closed) return "El local está cerrado este día.";
  const longest = longestShiftMinutes(shifts);
  if (longest > 0 && durationMinutes > longest) {
    return `${serviceName} dura ${durationMinutes} min y el bloque más largo de este día es de ${longest} min.`;
  }
  return `No hay un hueco de ${durationMinutes} min libre este día. Probá otra fecha.`;
}
