"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { fetchJson, getApiErrorMessage } from "@/lib/fetch-json";

type PublicSettings = {
  enabled: boolean;
  public_key: string;
  has_private_key: boolean;
  contact_email: string;
};

/**
 * Minimal VAPID admin (Turnos has no sys-admin yet).
 * Prefer env bootstrap for local; this UI persists to platform_settings.
 */
export function PushVapidSettingsCard() {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [publicKey, setPublicKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchJson<PublicSettings>("/api/v1/settings/push");
        setSettings(data);
        setPublicKey(data.public_key);
        setContactEmail(data.contact_email);
        setEnabled(data.enabled);
      } catch {
        /* hide card on failure — optional feature */
      }
    })();
  }, []);

  if (!settings) return null;

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const keys = await fetchJson<{ publicKey: string; privateKey: string }>("/api/v1/settings/push", {
        method: "PUT",
        body: JSON.stringify({ action: "generate" }),
      });
      setPublicKey(keys.publicKey);
      setPrivateKey(keys.privateKey);
      setMessage("Par generado — guardá para habilitar.");
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await fetchJson<PublicSettings>("/api/v1/settings/push", {
        method: "PUT",
        body: JSON.stringify({
          enabled,
          public_key: publicKey,
          private_key: privateKey || undefined,
          contact_email: contactEmail,
        }),
      });
      setSettings(data);
      setPrivateKey("");
      setMessage("VAPID guardado.");
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-2 border-divider px-4 py-3">
      <div className="font-heading text-sm font-extrabold">Claves VAPID (servidor)</div>
      <p className="text-xs text-text/70">
        También podés setear PUSH_VAPID_* en .env.local.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Habilitado
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-xs opacity-70">Email de contacto</span>
        <Input
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="admin@example.com"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs opacity-70">Clave pública</span>
        <Input value={publicKey} onChange={(e) => setPublicKey(e.target.value)} placeholder="B…" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs opacity-70">
          {settings.has_private_key ? "Clave privada (vacío = conservar)" : "Clave privada"}
        </span>
        <Input
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          placeholder="••••"
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void generate()}>
          Generar
        </Button>
        <Button type="button" variant="primary" size="sm" disabled={busy} onClick={() => void save()}>
          Guardar
        </Button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {message ? <p className="text-xs text-accent">{message}</p> : null}
    </div>
  );
}
