import type { Metadata } from "next";
import ConfirmClient from "./ConfirmClient";

export const metadata: Metadata = { title: "Confirmar turno — Turnos" };

export default async function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ConfirmClient token={token} />;
}
