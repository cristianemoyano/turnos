export type BizDraft = {
  name: string;
  phone: string;
  address: string;
  bankDetails: string;
  mapsUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
};
export type ProfessionalDraft = { id: string; name: string; phone: string };
export type ShiftDraft = { from: string; to: string };
export type DayHoursDraft = { day_of_week: string; is_open: boolean; shifts: ShiftDraft[] };
export type ServiceDraft = { id: string; name: string; duration_minutes: number; price: string };

export const DAY_LABELS: Record<string, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};
