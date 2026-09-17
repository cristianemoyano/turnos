import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Business, Service, Professional } from "@/lib/associations";
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

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await Business.findOne({
    where: { slug },
    attributes: ["id", "name", "slug", "timezone", "maps_url", "address"],
  });
  if (!business) notFound();

  const [services, professionals] = await Promise.all([
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
  ]);

  return (
    <BookingClient
      slug={business.slug}
      businessName={business.name}
      timezone={business.timezone}
      todayKey={dateKeyInTz(new Date(), business.timezone)}
      mapsUrl={business.maps_url}
      address={business.address}
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
