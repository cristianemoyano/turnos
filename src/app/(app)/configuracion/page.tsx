import type { Metadata } from "next";
import ConfiguracionClient from "./ConfiguracionClient";

export const metadata: Metadata = { title: "Configuración — Turnos" };

export default function ConfiguracionPage() {
  return <ConfiguracionClient />;
}
