import { NextResponse } from "next/server";
import { Business, Service } from "@/lib/associations";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const business = await Business.findOne({ where: { slug }, attributes: ["id"] });
  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado", code: "NOT_FOUND" }, { status: 404 });
  }

  const services = await Service.findAll({
    where: { business_id: business.id, active: true },
    attributes: ["id", "name", "duration_minutes", "price"],
    order: [["name", "ASC"]],
  });

  return NextResponse.json({
    data: services.map((s) => ({
      id: s.id,
      name: s.name,
      durationMinutes: s.duration_minutes,
      price: s.price,
    })),
  });
}
