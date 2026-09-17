import { toWhatsAppDigits } from "@/lib/phone";

/** Builds a wa.me deep link. `phone` may be null (generic share with no reply-to). */
export function waLink(phone: string | null | undefined, message: string): string {
  const digits = toWhatsAppDigits(phone);
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}
