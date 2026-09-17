"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { Card, CardKicker, CardTitle, CardBody } from "@/components/primitives/Card";
import { formatTimeInTz } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import { PlanInfoSheet } from "./PlanInfoSheet";
import { EditBusinessSheet } from "./EditBusinessSheet";
import { EditScheduleSheet } from "./EditScheduleSheet";
import { NewBlockSheet } from "./NewBlockSheet";
import { ProfessionalsSection } from "./ProfessionalsSection";

type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type Shift = { from: string; to: string };
type DayRow = { id: string; day_of_week: Weekday; is_open: boolean; shifts: Shift[] };

type Business = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  maps_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  slug: string;
  timezone: string;
  trial_ends_at: string | null;
};

type Professional = { id: string; name: string; phone: string | null };

type Block = {
  id: string;
  start_at: string;
  duration_minutes: number;
  reason: string | null;
  professional?: { id: string; name: string } | null;
};

const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS: Record<Weekday, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};

function trialLabel(trialEndsAt: string | null): string {
  if (!trialEndsAt) return "Prueba finalizada";
  const diffMs = new Date(trialEndsAt).getTime() - Date.now();
  if (diffMs <= 0) return "Prueba finalizada";
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  return days === 1 ? "1 día restante" : `${days} días restantes`;
}

function shiftRangeLabel(shifts: Shift[]): string {
  if (shifts.length === 0) return "Cerrado";
  return shifts.map((s) => `${s.from} a ${s.to}`).join(", ");
}

export default function ConfiguracionClient() {
  const { data: session } = useSession();
  const [business, setBusiness] = useState<Business | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [hours, setHours] = useState<DayRow[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  const [planOpen, setPlanOpen] = useState(false);
  const [editBusinessOpen, setEditBusinessOpen] = useState(false);
  const [editScheduleOpen, setEditScheduleOpen] = useState(false);
  const [newBlockOpen, setNewBlockOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    fetch("/api/v1/business")
      .then((res) => res.json())
      .then((json) => setBusiness(json.data ?? null));
    fetch("/api/v1/professionals")
      .then((res) => res.json())
      .then((json) => setProfessionals(json.data ?? []));
    fetch("/api/v1/business-hours")
      .then((res) => res.json())
      .then((json) => setHours(json.data ?? []));
    fetch("/api/v1/blocks")
      .then((res) => res.json())
      .then((json) => setBlocks(json.data ?? []));
  }, [refresh]);

  const bookingUrl = business ? `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/r/${business.slug}` : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      // clipboard not available — silently ignore, the input still shows the link
    }
  }

  async function removeBlock(id: string) {
    await fetch(`/api/v1/blocks/${id}`, { method: "DELETE" });
    setRefresh((r) => r + 1);
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut({ callbackUrl: "/login" });
    } catch {
      setSigningOut(false);
    }
  }

  const byDay = new Map(hours.map((h) => [h.day_of_week, h]));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-none px-5 pt-4.5 pb-3 border-b-2 border-divider">
        <h2 className="text-2xl">Configuración</h2>
      </div>
      <div className="flex-1 overflow-auto pb-16 flex flex-col gap-3 p-4">
        <Card elevated>
          <CardKicker>Plan</CardKicker>
          <CardTitle>{trialLabel(business?.trial_ends_at ?? null)}</CardTitle>
          <CardBody>Plan único · $35.000/mes al finalizar la prueba.</CardBody>
          <Button variant="ghost" className="self-start" onClick={() => setPlanOpen(true)}>
            Ver plan
          </Button>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <CardKicker>Negocio</CardKicker>
            <Button variant="ghost" size="sm" onClick={() => setEditBusinessOpen(true)}>
              Editar
            </Button>
          </div>
          <CardTitle>{business?.name ?? "—"}</CardTitle>
          <CardBody>
            {business?.phone || "Sin teléfono"}
            <br />
            {business?.address || "Sin dirección"}
            {business?.maps_url ? (
              <>
                <br />
                <a href={business.maps_url} target="_blank" rel="noreferrer" className="text-accent">
                  Ver en Google Maps
                </a>
              </>
            ) : null}
            {(business?.instagram_url || business?.facebook_url || business?.tiktok_url) && (
              <>
                <br />
                <span className="opacity-70">Redes: </span>
                {business.instagram_url ? (
                  <a href={business.instagram_url} target="_blank" rel="noreferrer" className="text-accent">
                    Instagram
                  </a>
                ) : null}
                {business.instagram_url && business.facebook_url ? " · " : null}
                {business.facebook_url ? (
                  <a href={business.facebook_url} target="_blank" rel="noreferrer" className="text-accent">
                    Facebook
                  </a>
                ) : null}
                {(business.instagram_url || business.facebook_url) && business.tiktok_url ? " · " : null}
                {business.tiktok_url ? (
                  <a href={business.tiktok_url} target="_blank" rel="noreferrer" className="text-accent">
                    TikTok
                  </a>
                ) : null}
              </>
            )}
          </CardBody>
        </Card>

        <ProfessionalsSection professionals={professionals} onRefresh={() => setRefresh((r) => r + 1)} />

        <Card>
          <div className="flex items-center justify-between">
            <CardKicker>Horarios</CardKicker>
            <Button variant="ghost" size="sm" onClick={() => setEditScheduleOpen(true)}>
              Editar
            </Button>
          </div>
          <CardTitle>Horarios de atención</CardTitle>
          <div className="flex flex-col gap-1 text-sm opacity-80">
            {WEEKDAYS.map((d) => {
              const row = byDay.get(d);
              return (
                <div key={d} className="flex justify-between gap-2">
                  <span className="opacity-70">{DAY_LABELS[d]}</span>
                  <span className="text-right">{row ? shiftRangeLabel(row.shifts) : "Cerrado"}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <CardKicker>Bloqueos</CardKicker>
            <Button variant="ghost" size="sm" onClick={() => setNewBlockOpen(true)}>
              + Agregar
            </Button>
          </div>
          <CardTitle>Próximos bloqueos</CardTitle>
          {blocks.length === 0 && <CardBody>No hay bloqueos programados.</CardBody>}
          <div className="flex flex-col gap-1.5">
            {blocks.map((b) => {
              const tz = business?.timezone ?? "America/Argentina/Buenos_Aires";
              const start = new Date(b.start_at);
              const end = new Date(start.getTime() + b.duration_minutes * 60000);
              const dateLabel = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short", timeZone: tz }).format(
                start,
              );
              const capitalized = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
              return (
                <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="opacity-80">
                    {capitalized} {formatTimeInTz(start, tz)}-{formatTimeInTz(end, tz)} · {b.professional?.name ?? "Todos"}
                    {b.reason && ` · ${b.reason}`}
                  </span>
                  <button
                    type="button"
                    aria-label="Quitar bloqueo"
                    onClick={() => removeBlock(b.id)}
                    className="text-accent cursor-pointer text-xs"
                  >
                    Quitar
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardKicker>Reservas online</CardKicker>
          <CardTitle>Compartir mi link de reserva</CardTitle>
          <Input readOnly value={bookingUrl} onFocus={(e) => e.target.select()} />
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={copyLink}>
              {copyFeedback ? "¡Copiado!" : "Copiar link"}
            </Button>
            <Button asChild variant="primary" block>
              <a
                href={waLink(null, `Reservá tu turno: ${bookingUrl}`)}
                target="_blank"
                rel="noreferrer"
              >
                Compartir
              </a>
            </Button>
          </div>
        </Card>

        <Card>
          <CardKicker>Cuenta</CardKicker>
          <CardTitle>{session?.user?.email ?? "Sesión activa"}</CardTitle>
          <CardBody>Cerrá la sesión en este dispositivo.</CardBody>
          <Button
            variant="secondary"
            className="self-start"
            disabled={signingOut}
            onClick={handleSignOut}
          >
            {signingOut ? "Cerrando…" : "Cerrar sesión"}
          </Button>
        </Card>
      </div>

      <PlanInfoSheet open={planOpen} onOpenChange={setPlanOpen} />
      <EditBusinessSheet
        business={business}
        open={editBusinessOpen}
        onOpenChange={setEditBusinessOpen}
        onSaved={() => setRefresh((r) => r + 1)}
      />
      <EditScheduleSheet
        hours={hours}
        open={editScheduleOpen}
        onOpenChange={setEditScheduleOpen}
        onSaved={() => setRefresh((r) => r + 1)}
      />
      <NewBlockSheet
        open={newBlockOpen}
        onOpenChange={setNewBlockOpen}
        onCreated={() => setRefresh((r) => r + 1)}
        professionals={professionals}
      />
    </div>
  );
}
