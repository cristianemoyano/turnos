import { toWhatsAppDigits } from "@/lib/phone";

/** Builds a wa.me deep link. `phone` may be null (generic share with no reply-to). */
export function waLink(phone: string | null | undefined, message: string): string {
  const digits = toWhatsAppDigits(phone);
  // Empty phone → text-only share. Never emit bare `https://wa.me/54` (old bug:
  // null phone became country code only and WhatsApp opened with no compose text).
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}
