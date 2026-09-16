"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives/Button";
import { StepNegocio } from "./StepNegocio";
import { StepHorarios } from "./StepHorarios";
import { StepServicios } from "./StepServicios";
import { StepListo } from "./StepListo";
import type { BizDraft, ProfessionalDraft, DayHoursDraft, ServiceDraft } from "./types";

const TITLES = ["Tu negocio", "Horarios de atención", "Tus servicios", "Todo listo"];
const SUBTITLES = [
  "Datos básicos para tu agenda",
  "¿Cuándo atendés?",
  "Ajustá los servicios de ejemplo o agregá los tuyos",
  "Ya podés recibir turnos",
];

export default function OnboardingClient({
  business,
  initialProfessionals,
  initialHours,
  initialServices,
}: {
  business: BizDraft;
  initialProfessionals: ProfessionalDraft[];
  initialHours: DayHoursDraft[];
  initialServices: ServiceDraft[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [biz, setBiz] = useState<BizDraft>(business);
  const [professionals, setProfessionals] = useState<ProfessionalDraft[]>(
    initialProfessionals.length ? initialProfessionals : [{ id: "new-owner", name: "", phone: business.phone }],
  );
  const [hours, setHours] = useState<DayHoursDraft[]>(initialHours);
  const [services, setServices] = useState<ServiceDraft[]>(initialServices);

  async function saveNegocio() {
    await fetch("/api/v1/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: biz.name, phone: biz.phone, address: biz.address }),
    });

    for (const pr of professionals) {
      if (!pr.name.trim()) continue;
      if (pr.id.startsWith("new-")) {
        const res = await fetch("/api/v1/professionals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: pr.name, phone: pr.phone }),
        });
        const json = await res.json();
        pr.id = json.data.id;
      } else {
        await fetch(`/api/v1/professionals/${pr.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: pr.name, phone: pr.phone }),
        });
      }
    }
    setProfessionals([...professionals]);
  }

  async function saveHorarios() {
    await fetch("/api/v1/business-hours", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: hours }),
    });
  }

  async function addService(input: { name: string; duration_minutes: number; price: number }): Promise<ServiceDraft | null> {
    const res = await fetch("/api/v1/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const created: ServiceDraft = { id: json.data.id, name: json.data.name, duration_minutes: json.data.duration_minutes, price: json.data.price };
    setServices((prev) => [...prev, created]);
    return created;
  }

  async function saveServicios() {
    for (const sv of services) {
      await fetch(`/api/v1/services/${sv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sv.name, duration_minutes: sv.duration_minutes, price: Number(sv.price) || 0 }),
      });
    }
  }

  async function handleNext() {
    setSaving(true);
    try {
      if (step === 0) await saveNegocio();
      if (step === 1) await saveHorarios();
      if (step === 2) await saveServicios();

      if (step >= 3) {
        await fetch("/api/v1/onboarding/complete", { method: "POST" });
        router.push("/agenda");
        router.refresh();
        return;
      }
      setStep((s) => s + 1);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg pt-8">
      <div className="px-5 pb-3.5">
        <div className="flex gap-1.5 mb-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`h-1 flex-1 ${i <= step ? "bg-accent" : "bg-neutral-300"}`} />
          ))}
        </div>
        <h2 className="text-[22px] mb-0.5">{TITLES[step]}</h2>
        <p className="text-[13px] opacity-65 m-0">{SUBTITLES[step]}</p>
      </div>

      <div className="flex-1 overflow-auto px-5 pb-5">
        {step === 0 && <StepNegocio biz={biz} setBiz={setBiz} professionals={professionals} setProfessionals={setProfessionals} />}
        {step === 1 && <StepHorarios hours={hours} setHours={setHours} />}
        {step === 2 && <StepServicios services={services} setServices={setServices} onAddService={addService} />}
        {step === 3 && <StepListo biz={biz} />}
      </div>

      <div className="flex-none px-5 py-5 flex gap-2.5 border-t-2 border-divider">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep((s) => s - 1)} disabled={saving}>
            Atrás
          </Button>
        )}
        <Button variant="primary" block onClick={handleNext} disabled={saving}>
          {step === 3 ? "Ir a mi agenda" : "Continuar"}
        </Button>
      </div>
    </div>
  );
}
