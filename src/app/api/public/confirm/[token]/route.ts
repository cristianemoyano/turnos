import { NextResponse } from "next/server";
import { Appointment, Client, Service, Business } from "@/lib/associations";
import { dateLabelInTz } from "@/lib/tz";

async function loadByToken(token: string) {
  return Appointment.findOne({
    where: { confirmation_token: token, kind: "appointment" },
    include: [
      { model: Client, as: "client" },
      { model: Service, as: "service" },
    ],
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const appointment = await loadByToken(token);
  if (!appointment) {
    return NextResponse.json({ error: "Turno no encontrado", code: "NOT_FOUND" }, { status: 404 });
  }

  const business = await Business.findByPk(appointment.business_id, { attributes: ["name", "timezone"] });
  const timeZone = business?.timezone || "America/Argentina/Buenos_Aires";

  return NextResponse.json({
    data: {
      status: appointment.status,
      businessName: business?.name ?? "",
      clientName: appointment.get("client") ? (appointment.get("client") as Client).name : "",
      serviceName: appointment.get("service") ? (appointment.get("service") as Service).name : "",
      dateLabel: dateLabelInTz(appointment.start_at, timeZone),
      time: new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(
        appointment.start_at,
      ),
    },
  });
}

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const appointment = await loadByToken(token);
  if (!appointment) {
    return NextResponse.json({ error: "Turno no encontrado", code: "NOT_FOUND" }, { status: 404 });
  }
  if (appointment.status === "cancelled") {
    return NextResponse.json({ error: "Este turno fue cancelado", code: "CANCELLED" }, { status: 409 });
  }
  if (appointment.status === "pending") {
    appointment.status = "confirmed";
    await appointment.save();
  }
  return NextResponse.json({ data: { status: appointment.status } });
}
