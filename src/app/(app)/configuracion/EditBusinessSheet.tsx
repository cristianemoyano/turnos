"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/primitives/Sheet";
import { Button } from "@/components/primitives/Button";
import { Input, Textarea } from "@/components/primitives/Input";
import { FormField } from "@/components/primitives/FormField";
import { PHONE_HINT, PHONE_PLACEHOLDER, isValidShareablePhone } from "@/lib/phone";

type Business = {
  name: string;
  phone: string | null;
  address: string | null;
  bank_details?: string | null;
  maps_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  tiktok_url?: string | null;
};

function looksLikeHttpUrl(value: string): boolean {
  return !value.trim() || /^https?:\/\//i.test(value.trim());
}

export function EditBusinessSheet({
  business,
  open,
  onOpenChange,
  onSaved,
}: {
  business: Business | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !business) return;
    const current = business;
    let cancelled = false;
    async function sync() {
      await Promise.resolve();
      if (cancelled) return;
      setName(current.name ?? "");
      setPhone(current.phone ?? "");
      setAddress(current.address ?? "");
      setBankDetails(current.bank_details ?? "");
      setMapsUrl(current.maps_url ?? "");
      setInstagramUrl(current.instagram_url ?? "");
      setFacebookUrl(current.facebook_url ?? "");
      setTiktokUrl(current.tiktok_url ?? "");
      setError("");
    }
    sync();
    return () => {
      cancelled = true;
    };
  }, [open, business]);

  async function submit() {
    if (phone.trim() && !isValidShareablePhone(phone)) {
      setError("Revisá el teléfono: necesitamos un número compartible por WhatsApp.");
      return;
    }
    if (!looksLikeHttpUrl(mapsUrl)) {
      setError("Pegá el link completo de Google Maps (https://…).");
      return;
    }
    if (!looksLikeHttpUrl(instagramUrl)) {
      setError("Pegá el link completo de Instagram (https://…).");
      return;
    }
    if (!looksLikeHttpUrl(facebookUrl)) {
      setError("Pegá el link completo de Facebook (https://…).");
      return;
    }
    if (!looksLikeHttpUrl(tiktokUrl)) {
      setError("Pegá el link completo de TikTok (https://…).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/v1/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone.trim() || null,
          address: address.trim() || null,
          bankDetails: bankDetails.trim() || null,
          mapsUrl: mapsUrl.trim() || null,
          instagramUrl: instagramUrl.trim() || null,
          facebookUrl: facebookUrl.trim() || null,
          tiktokUrl: tiktokUrl.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "No se pudo guardar.");
        return;
      }
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <h3 className="text-xl">Mi negocio</h3>
      <FormField label="Nombre" htmlFor="eb-name">
        <Input id="eb-name" value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField label="Teléfono (WhatsApp)" htmlFor="eb-phone" hint={PHONE_HINT}>
        <Input
          id="eb-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={PHONE_PLACEHOLDER}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </FormField>
      <FormField label="Dirección" htmlFor="eb-address">
        <Input id="eb-address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </FormField>
      <FormField
        label="Datos bancarios (seña)"
        htmlFor="eb-bank"
        hint="Alias, CBU o lo que necesiten los clientes para transferir la seña"
      >
        <Textarea
          id="eb-bank"
          rows={3}
          placeholder={"Alias: mi.negocio\nCBU: 00000031000…\nBanco Galicia"}
          value={bankDetails}
          onChange={(e) => setBankDetails(e.target.value)}
        />
      </FormField>
      <FormField
        label="Link de Google Maps"
        htmlFor="eb-maps"
        hint="Pegá el link para “Cómo llegar” en la reserva online"
      >
        <Input
          id="eb-maps"
          type="url"
          inputMode="url"
          placeholder="https://maps.google.com/…"
          value={mapsUrl}
          onChange={(e) => setMapsUrl(e.target.value)}
        />
      </FormField>
      <FormField label="Instagram" htmlFor="eb-ig" hint="Opcional — se muestra en la reserva online">
        <Input
          id="eb-ig"
          type="url"
          inputMode="url"
          placeholder="https://instagram.com/…"
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
        />
      </FormField>
      <FormField label="Facebook" htmlFor="eb-fb">
        <Input
          id="eb-fb"
          type="url"
          inputMode="url"
          placeholder="https://facebook.com/…"
          value={facebookUrl}
          onChange={(e) => setFacebookUrl(e.target.value)}
        />
      </FormField>
      <FormField label="TikTok" htmlFor="eb-tt">
        <Input
          id="eb-tt"
          type="url"
          inputMode="url"
          placeholder="https://tiktok.com/@…"
          value={tiktokUrl}
          onChange={(e) => setTiktokUrl(e.target.value)}
        />
      </FormField>
      {error && <p className="text-xs text-accent-700 m-0">{error}</p>}
      <Button variant="primary" block onClick={submit} disabled={saving || !name.trim()}>
        {saving ? "Guardando..." : "Guardar"}
      </Button>
    </Sheet>
  );
}
