export type RawAppointment = {
  id: string;
  professional_id: string | null;
  client_id: string | null;
  service_id: string | null;
  kind: "appointment" | "block";
  status: "pending" | "confirmed" | "done" | "cancelled";
  source: "staff" | "online";
  start_at: string;
  duration_minutes: number;
  price: string | null;
  reason: string | null;
  confirmation_token: string;
  deposit_required: string | null;
  deposit_paid: boolean;
  client?: { id: string; name: string; phone: string | null } | null;
  service?: {
    id: string;
    name: string;
    duration_minutes: number;
    price: string;
    segments?: ServiceSegmentInfo[];
  } | null;
  professional?: { id: string; name: string } | null;
};

export type Professional = { id: string; name: string; phone: string | null };
export type ServiceSegmentInfo = { id: string; type: "work" | "wait"; label: string; duration_minutes: number };
export type ServiceInfo = {
  id: string;
  name: string;
  duration_minutes: number;
  price: string;
  deposit_amount: string | null;
  segments?: ServiceSegmentInfo[];
};
export type DayHours = { dayOfWeek: string; isOpen: boolean; shifts: { from: string; to: string }[] };
export type DayShift = { from: string; to: string };
export type BookingData = {
  professionals: Professional[];
  services: ServiceInfo[];
  hours: DayHours[];
};

export type SheetState =
  | { type: "slot"; time: string; overtime?: boolean }
  | { type: "appointment"; appointment: RawAppointment; stageLabel?: string }
  | { type: "block"; appointment: RawAppointment }
  | { type: "new"; presetTime?: string; overtime?: boolean; forgotten?: boolean }
  | null;
