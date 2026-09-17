"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/primitives/Button";
import { fetchJson, getApiErrorMessage } from "@/lib/fetch-json";
import { describePushSubscribeError, isPushSupported, subscribePush } from "@/lib/web-push-client";

type PushConfig = { enabled: boolean; public_key: string };
type PushState = "checking" | "unavailable" | "default" | "denied" | "subscribed" | "unsubscribed";

export function PushSubscriptionCard() {
  const [config, setConfig] = useState<PushConfig | null>(null);
  const [state, setState] = useState<PushState>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isPushSupported()) {
        if (!cancelled) setState("unavailable");
        return;
      }
      try {
        const cfg = await fetchJson<PushConfig>("/api/v1/notifications/push/config");
        if (cancelled) return;
        setConfig(cfg);
        if (!cfg.enabled || !cfg.public_key) {
          setState("unavailable");
          return;
        }
        if (Notification.permission === "denied") {
          setState("denied");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setState(sub ? "subscribed" : "default");
      } catch {
        if (!cancelled) setState("unavailable");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubscribe() {
    if (!config?.public_key) return;
    setError(null);
    setFeedback(null);
    setBusy(true);
    let sub: PushSubscription | null = null;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      sub = await subscribePush(reg, config.public_key);
      await fetchJson("/api/v1/notifications/push/subscribe", {
        method: "POST",
        body: JSON.stringify(sub.toJSON()),
      });
      setState("subscribed");
      setFeedback("Notificaciones push activadas");
    } catch (e) {
      if (sub) await sub.unsubscribe().catch(() => {});
      const message = describePushSubscribeError(e);
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUnsubscribe() {
    setError(null);
    setFeedback(null);
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetchJson("/api/v1/notifications/push/unsubscribe", {
          method: "POST",
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("unsubscribed");
      setFeedback("Notificaciones push desactivadas");
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (state === "checking" || state === "unavailable") return null;

  return (
    <CardLike>
      <div>
        <div className="font-heading text-sm font-extrabold">Notificaciones push</div>
        {state === "denied" ? (
          <p className="mt-1 text-xs text-text/70">
            Bloqueaste las notificaciones; habilitalas desde la configuración del navegador.
          </p>
        ) : (
          <p className="mt-1 text-xs text-text/70">Avisos de turnos aunque la pestaña esté cerrada.</p>
        )}
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        {feedback ? <p className="mt-1 text-xs text-accent">{feedback}</p> : null}
      </div>
      {state !== "denied" ? (
        <Button
          type="button"
          variant={state === "subscribed" ? "secondary" : "primary"}
          size="sm"
          disabled={busy}
          onClick={() => void (state === "subscribed" ? handleUnsubscribe() : handleSubscribe())}
        >
          {busy ? "Un momento…" : state === "subscribed" ? "Desactivar" : "Activar"}
        </Button>
      ) : null}
    </CardLike>
  );
}

function CardLike({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-2 border-divider bg-bg px-4 py-3">
      {children}
    </div>
  );
}
