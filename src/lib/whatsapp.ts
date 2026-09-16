/** Builds a wa.me deep link. `phone` may be null (e.g. generic confirmation with no reply-to). */
export function waLink(phone: string | null | undefined, message: string): string {
  const digits = ("54" + (phone || "")).replace(/\D/g, "");
  return "https://wa.me/" + digits + "?text=" + encodeURIComponent(message);
}
