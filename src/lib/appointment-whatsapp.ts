import { money, formatTimeInTz } from "@/lib/format";
import { dateLabelInTz } from "@/lib/tz";

export type AppointmentWhatsAppKind = "confirm_request" | "reminder";

export type AppointmentWhatsAppInput = {
  kind: AppointmentWhatsAppKind;
  clientName: string;
  serviceName?: string | null;
  professionalName?: string | null;
  startAt: Date | string;
  timezone: string;
  address?: string | null;
  depositRequired?: string | number | null;
  depositPaid?: boolean;
  bankDetails?: string | null;
  confirmationToken?: string | null;
  /** Absolute origin, e.g. https://turnos.andiko.cloud */
  origin: string;
};

function hasDeposit(amount: string | number | null | undefined): boolean {
  if (amount == null || amount === "") return false;
  return Number(amount) > 0;
}

/**
 * Builds the Spanish WhatsApp prefill for ask-confirm / reminder shares.
 * Confirm link only when pending; cancel link when token exists and status allows
 * (caller sets include via kind + token).
 */
export function buildAppointmentWhatsAppMessage(input: AppointmentWhatsAppInput): string {
  const start = typeof input.startAt === "string" ? new Date(input.startAt) : input.startAt;
  const dateLabel = dateLabelInTz(start, input.timezone);
  const time = formatTimeInTz(start, input.timezone);
  const name = (input.clientName || "").trim() || "hola";
  const service = (input.serviceName || "").trim();
  const professional = (input.professionalName || "").trim();
  const address = (input.address || "").trim();
  const token = (input.confirmationToken || "").trim();
  const origin = input.origin.replace(/\/$/, "");

  const lines: string[] = [];

  if (input.kind === "reminder") {
    lines.push(`Hola ${name}! Te recordamos tu turno:`);
  } else {
    lines.push(`Hola ${name}! Te agendé un turno:`);
  }

  lines.push("");
  lines.push(`📅 ${dateLabel} a las ${time}`);

  if (service || professional) {
    const parts = [service, professional ? `con ${professional}` : ""].filter(Boolean);
    lines.push(`✂️ ${parts.join(" · ")}`);
  }

  if (address) {
    lines.push(`📍 ${address}`);
  }

  if (hasDeposit(input.depositRequired)) {
    lines.push("");
    if (input.depositPaid) {
      lines.push(`Seña: ${money(input.depositRequired)} (ya registrada)`);
    } else {
      lines.push(`Seña requerida: ${money(input.depositRequired)}`);
      const bank = (input.bankDetails || "").trim();
      if (bank) {
        lines.push("Datos para transferir:");
        lines.push(bank);
      }
    }
  }

  if (token) {
    lines.push("");
    if (input.kind === "confirm_request") {
      lines.push(`Confirmá tu turno acá: ${origin}/confirmar/${token}`);
    }
    lines.push(`Si no podés asistir, cancelá acá: ${origin}/cancelar/${token}`);
  }

  return lines.join("\n");
}
