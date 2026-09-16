export function money(n: number | string | null | undefined): string {
  const value = Math.round(Number(n) || 0);
  return "$" + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Formats a Date as "HH:mm" in the given IANA timezone. */
export function formatTimeInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
}

export function timeStringToMinutes(t: string): number {
  const [h, m] = (t || "0:0").split(":");
  return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
}

export function minutesToTimeString(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = ((mins % 60) + 60) % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}
