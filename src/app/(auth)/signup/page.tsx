import type { Metadata } from "next";
import SignupClient from "./SignupClient";

export const metadata: Metadata = { title: "Crear cuenta — Turnos" };

export default function SignupPage() {
  return <SignupClient />;
}
