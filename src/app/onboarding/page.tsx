import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Business, Professional, BusinessHours, Service, ServiceSegment } from "@/lib/associations";
import OnboardingClient from "./OnboardingClient";

export const metadata: Metadata = { title: "Bienvenido — Turnos" };

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await Business.findByPk(session.user.businessId);
  if (!business) redirect("/login");
  if (business.onboarding_completed_at) redirect("/agenda");

  const [professionals, hoursRows, services] = await Promise.all([
    Professional.findAll({ where: { business_id: business.id }, order: [["created_at", "ASC"]] }),
    BusinessHours.findAll({ where: { business_id: business.id } }),
    Service.findAll({
      where: { business_id: business.id },
      include: [{ model: ServiceSegment, as: "segments" }],
      order: [["created_at", "ASC"]],
    }),
  ]);

  const byDay = new Map(hoursRows.map((r) => [r.day_of_week, r]));
  const hours = WEEKDAYS.map((day) => {
    const row = byDay.get(day);
    return {
      day_of_week: day,
      is_open: row?.is_open ?? false,
      shifts: row?.shifts ?? [],
    };
  });

  return (
    <OnboardingClient
      business={{
        name: business.name,
        phone: business.phone ?? "",
        address: business.address ?? "",
        mapsUrl: business.maps_url ?? "",
        instagramUrl: business.instagram_url ?? "",
        facebookUrl: business.facebook_url ?? "",
        tiktokUrl: business.tiktok_url ?? "",
      }}
      initialProfessionals={professionals.map((p) => ({ id: p.id, name: p.name, phone: p.phone ?? "" }))}
      initialHours={hours}
      initialServices={services.map((s) => ({
        id: s.id,
        name: s.name,
        duration_minutes: s.duration_minutes,
        price: s.price,
      }))}
    />
  );
}
