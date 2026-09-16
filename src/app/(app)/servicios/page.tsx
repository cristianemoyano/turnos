import type { Metadata } from "next";
import ServiciosClient from "./ServiciosClient";

export const metadata: Metadata = { title: "Servicios — Turnos" };

export default function ServiciosPage() {
  return <ServiciosClient />;
}
