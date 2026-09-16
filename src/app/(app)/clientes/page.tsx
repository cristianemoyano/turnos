import type { Metadata } from "next";
import ClientesClient from "./ClientesClient";

export const metadata: Metadata = { title: "Clientes — Turnos" };

export default function ClientesPage() {
  return <ClientesClient />;
}
