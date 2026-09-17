/** Conversión estándar de una clave VAPID base64 URL-safe a bytes, para `applicationServerKey`. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

/**
 * Suscribe el service worker con `publicKey`, reemplazando cualquier suscripción previa —
 * un browser sólo mantiene una suscripción activa por registration.
 */
export async function subscribePush(
  reg: ServiceWorkerRegistration,
  publicKey: string,
): Promise<PushSubscription> {
  const existing = await reg.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey.trim()),
  });
}

/** Traduce errores comunes de `pushManager.subscribe()` a un mensaje accionable en español. */
export function describePushSubscribeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/push service error/i.test(raw) || (err instanceof DOMException && err.name === "AbortError")) {
    return (
      "El navegador no pudo registrar el push service (FCM). En local usá Chrome o Firefox " +
      "normal — no el browser de Cursor. En Brave: Privacidad → “Use Google services for push messaging”."
    );
  }
  return raw || "No se pudo activar push";
}
