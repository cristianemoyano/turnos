export type RawAppointment = {
  id: string;
  professional_id: string | null;
  client_id: string | null;
  service_id: string | null;
  kind: "appointment" | "block";
  status: "confirmed" | "done" | "cancelled";
  source: "staff" | "online";
  start_at: string;
  duration_minutes: number;
  price: string | null;
  reason: string | null;
  client?: { id: string; name: string; phone: string | null } | null;
  service?: { id: string; name: string; duration_minutes: number; price: string } | null;
  professional?: { id: string; name: string } | null;
};

export type Professional = { id: string; name: string; phone: string | null };
export type ServiceSegmentInfo = { id: string; type: "work" | "wait"; label: string; duration_minutes: number };
export type ServiceInfo = {
  id: string;
  name: string;
  duration_minutes: number;
  price: string;
  segments?: ServiceSegmentInfo[];
};
export type DayHours = { dayOfWeek: string; isOpen: boolean; shifts: { from: string; to: string }[] };
export type BookingData = {
  professionals: Professional[];
  services: ServiceInfo[];
  hours: DayHours[];
};

export type SheetState =
  | { type: "slot"; time: string }
  | { type: "appointment"; appointment: RawAppointment }
  | { type: "block"; appointment: RawAppointment }
  | { type: "new"; presetTime?: string }
  | null;
