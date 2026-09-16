import type { Metadata } from "next";
import MasClient from "./MasClient";

export const metadata: Metadata = { title: "Más — Turnos" };

export default function MasPage() {
  return <MasClient />;
}
