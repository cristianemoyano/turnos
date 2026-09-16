"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { FormField } from "@/components/primitives/FormField";

export default function LoginClient() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError("");
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: String(form.get("email") || ""),
        password: String(form.get("password") || ""),
        redirect: false,
      });
      if (result?.error) {
        setServerError("Email o contraseña incorrectos");
        return;
      }
      router.push("/agenda");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 bg-surface p-5 shadow-[var(--shadow-md)]">
      <FormField label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" required />
      </FormField>
      <FormField label="Contraseña" htmlFor="password" required>
        <Input id="password" name="password" type="password" required />
      </FormField>
      {serverError && <p className="text-sm text-accent-700 m-0">{serverError}</p>}
      <Button type="submit" variant="primary" block disabled={loading}>
        {loading ? "Ingresando..." : "Ingresar"}
      </Button>
      <p className="text-sm text-center opacity-70 m-0">
        ¿No tenés cuenta? <Link href="/signup" className="text-accent">Creá una</Link>
      </p>
    </form>
  );
}
