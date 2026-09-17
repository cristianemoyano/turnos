import { z } from "zod";

const DEFAULT_CC = "54";

export const PHONE_HINT = "Con código de país, ej. +54 9 261 555-1234";
export const PHONE_PLACEHOLDER = "+54 9 11 1234-5678";
export const PHONE_INVALID_MSG = "Usá un teléfono válido con código de país (ej. +54 9 11 1234-5678)";

export function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Normalize to WhatsApp / E.164 digits without "+".
 * Assumes Argentina (+54) when no country code is present.
 * Local 10-digit mobiles get a leading 9 (WhatsApp AR format).
 */
export function toWhatsAppDigits(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let d = phoneDigits(raw);
  if (!d) return null;

  if (d.startsWith("00")) d = d.slice(2);

  if (d.startsWith(DEFAULT_CC)) {
    if (d.length >= 10 && d.length <= 15) return d;
    return null;
  }

  if (d.startsWith("0")) d = d.slice(1);

  // 11 digits starting with 9 → national mobile (9 + area + number)
  if (d.length === 11 && d.startsWith("9")) {
    return DEFAULT_CC + d;
  }

  // 10 digits → area + number; treat as mobile for WhatsApp
  if (d.length === 10) {
    return DEFAULT_CC + "9" + d;
  }

  // Other national lengths (landline-ish)
  if (d.length >= 8 && d.length <= 12) {
    return DEFAULT_CC + d;
  }

  return null;
}

export function toE164(raw: string | null | undefined): string | null {
  const digits = toWhatsAppDigits(raw);
  return digits ? `+${digits}` : null;
}

export function isValidShareablePhone(raw: string): boolean {
  return toWhatsAppDigits(raw) !== null;
}

/** Required phone → stored as +E.164. */
export const requiredPhoneSchema = z
  .string()
  .trim()
  .min(6)
  .max(30)
  .refine((v) => isValidShareablePhone(v), { message: PHONE_INVALID_MSG })
  .transform((v) => toE164(v)!);

/**
 * Optional phone for PATCH/POST bodies.
 * `undefined` = omit; `null` / `""` = clear; otherwise +E.164.
 */
export const optionalPhoneSchema = z
  .union([z.string(), z.null()])
  .optional()
  .superRefine((v, ctx) => {
    if (v === undefined || v === null) return;
    const trimmed = v.trim();
    if (!trimmed) return;
    if (trimmed.length > 30) {
      ctx.addIssue({ code: z.ZodIssueCode.too_big, maximum: 30, type: "string", inclusive: true, origin: "string" });
      return;
    }
    if (!isValidShareablePhone(trimmed)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: PHONE_INVALID_MSG });
    }
  })
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null || !v.trim()) return null;
    return toE164(v.trim());
  });
