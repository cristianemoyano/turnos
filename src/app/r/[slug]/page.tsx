import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Business, Service, Professional, BusinessHours } from "@/lib/associations";
import type { Weekday } from "@/modules/business/business-hours.model";
import { dateKeyInTz } from "@/lib/tz";
import BookingClient from "./BookingClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const business = await Business.findOne({ where: { slug }, attributes: ["name"] });
  return { title: business ? `Reservar turno — ${business.name}` : "Reservar turno" };
}

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

function formatShifts(shifts: { from: string; to: string }[]): string {
  return shifts.map((s) => `${s.from} a ${s.to}`).join(", ");
}

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await Business.findOne({
    where: { slug },
    attributes: [
      "id",
      "name",
      "slug",
      "timezone",
      "maps_url",
      "address",
      "instagram_url",
      "facebook_url",
      "tiktok_url",
    ],
  });
  if (!business) notFound();

  const [services, professionals, hoursRows] = await Promise.all([
    Service.findAll({
      where: { business_id: business.id, active: true },
      attributes: ["id", "name", "duration_minutes", "price"],
      order: [["name", "ASC"]],
    }),
    Professional.findAll({
      where: { business_id: business.id },
      attributes: ["id", "name"],
      order: [["created_at", "ASC"]],
    }),
    BusinessHours.findAll({
      where: { business_id: business.id },
      attributes: ["day_of_week", "is_open", "shifts"],
    }),
  ]);

  const byDay = new Map(hoursRows.map((h) => [h.day_of_week, h]));
  const openHours = WEEKDAYS.flatMap((day) => {
    const row = byDay.get(day);
    if (!row?.is_open || !row.shifts?.length) return [];
    return [{ dayLabel: DAY_LABELS[day], range: formatShifts(row.shifts) }];
  });

  return (
    <BookingClient
      slug={business.slug}
      businessName={business.name}
      timezone={business.timezone}
      todayKey={dateKeyInTz(new Date(), business.timezone)}
      mapsUrl={business.maps_url}
      address={business.address}
      instagramUrl={business.instagram_url}
      facebookUrl={business.facebook_url}
      tiktokUrl={business.tiktok_url}
      businessHours={openHours}
      services={services.map((s) => ({
        id: s.id,
        name: s.name,
        durationMinutes: s.duration_minutes,
        price: s.price,
      }))}
      professionals={professionals.map((p) => ({ id: p.id, name: p.name || "Sin nombre" }))}
    />
  );
}
