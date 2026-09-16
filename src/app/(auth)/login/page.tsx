import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = { title: "Ingresar — Turnos" };

export default function LoginPage() {
  return <LoginClient />;
}
