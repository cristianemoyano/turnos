import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Business } from "@/lib/associations";
import { dateKeyInTz } from "@/lib/tz";
import AgendaClient from "./AgendaClient";

export const metadata: Metadata = { title: "Agenda — Turnos" };

export default async function AgendaPage() {
  const session = await auth();
  const business = await Business.findByPk(session!.user.businessId, {
    attributes: ["name", "timezone", "address", "bank_details"],
  });
  const timezone = business?.timezone ?? "America/Argentina/Buenos_Aires";
  const todayKey = dateKeyInTz(new Date(), timezone);

  return (
    <AgendaClient
      timezone={timezone}
      todayKey={todayKey}
      businessInfo={{
        address: business?.address ?? null,
        bankDetails: business?.bank_details ?? null,
      }}
    />
  );
}
