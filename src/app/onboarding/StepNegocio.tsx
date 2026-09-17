"use client";

import { Input } from "@/components/primitives/Input";
import { FormField } from "@/components/primitives/FormField";
import { Button } from "@/components/primitives/Button";
import { PHONE_HINT, PHONE_PLACEHOLDER } from "@/lib/phone";
import type { BizDraft, ProfessionalDraft } from "./types";

export function StepNegocio({
  biz,
  setBiz,
  professionals,
  setProfessionals,
}: {
  biz: BizDraft;
  setBiz: (b: BizDraft) => void;
  professionals: ProfessionalDraft[];
  setProfessionals: (p: ProfessionalDraft[]) => void;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <FormField label="Nombre del negocio">
        <Input value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} />
      </FormField>
      <FormField label="Teléfono (WhatsApp)" hint={PHONE_HINT}>
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={PHONE_PLACEHOLDER}
          value={biz.phone}
          onChange={(e) => setBiz({ ...biz, phone: e.target.value })}
        />
      </FormField>
      <FormField label="Dirección">
        <Input value={biz.address} onChange={(e) => setBiz({ ...biz, address: e.target.value })} />
      </FormField>
      <FormField label="Link de Google Maps" hint="Opcional — se muestra en la reserva online">
        <Input
          type="url"
          inputMode="url"
          placeholder="https://maps.google.com/…"
          value={biz.mapsUrl}
          onChange={(e) => setBiz({ ...biz, mapsUrl: e.target.value })}
        />
      </FormField>
      <FormField label="Instagram" hint="Opcional — se muestra en la reserva online">
        <Input
          type="url"
          inputMode="url"
          placeholder="https://instagram.com/…"
          value={biz.instagramUrl}
          onChange={(e) => setBiz({ ...biz, instagramUrl: e.target.value })}
        />
      </FormField>
      <FormField label="Facebook">
        <Input
          type="url"
          inputMode="url"
          placeholder="https://facebook.com/…"
          value={biz.facebookUrl}
          onChange={(e) => setBiz({ ...biz, facebookUrl: e.target.value })}
        />
      </FormField>
      <FormField label="TikTok">
        <Input
          type="url"
          inputMode="url"
          placeholder="https://tiktok.com/@…"
          value={biz.tiktokUrl}
          onChange={(e) => setBiz({ ...biz, tiktokUrl: e.target.value })}
        />
      </FormField>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-wide opacity-55">Profesionales</span>
        {professionals.map((pr, idx) => (
          <div key={pr.id} className="flex items-start gap-2 bg-surface p-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <Input
                placeholder="Nombre"
                value={pr.name}
                onChange={(e) => {
                  const next = [...professionals];
                  next[idx] = { ...pr, name: e.target.value };
                  setProfessionals(next);
                }}
              />
              <Input
                type="tel"
                placeholder={PHONE_PLACEHOLDER}
                value={pr.phone}
                onChange={(e) => {
                  const next = [...professionals];
                  next[idx] = { ...pr, phone: e.target.value };
                  setProfessionals(next);
                }}
              />
            </div>
            {professionals.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Quitar"
                onClick={() => setProfessionals(professionals.filter((_, i) => i !== idx))}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </Button>
            )}
          </div>
        ))}
        <Button
          variant="secondary"
          onClick={() => setProfessionals([...professionals, { id: `new-${Date.now()}`, name: "", phone: "" }])}
        >
          + Agregar profesional
        </Button>
      </div>
    </div>
  );
}
