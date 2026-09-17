"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { PasswordInput } from "@/components/primitives/PasswordInput";
import { FormField } from "@/components/primitives/FormField";
import Link from "next/link";
import { isCapEnabled } from "@/lib/cap-config";
import { solveCapChallenge } from "@/lib/cap-solve";

export default function SignupClient() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError("");
    const form = new FormData(e.currentTarget);
    const payload = {
      businessName: String(form.get("businessName") || ""),
      ownerName: String(form.get("ownerName") || ""),
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
    };

    setLoading(true);
    try {
      let signupCapToken: string | null = null;
      if (isCapEnabled()) {
        try {
          signupCapToken = await solveCapChallenge();
          if (!signupCapToken) {
            setServerError("No pudimos verificar que sos humano. Probá de nuevo.");
            return;
          }
        } catch {
          setServerError("No pudimos verificar que sos humano. Probá de nuevo.");
          return;
        }
      }

      const res = await fetch("/api/v1/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, capToken: signupCapToken ?? undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.code === "VALIDATION_ERROR") {
          const fieldErrors: Record<string, string> = {};
          for (const [field, msgs] of Object.entries(json.details?.fieldErrors ?? {})) {
            if (Array.isArray(msgs) && msgs[0]) fieldErrors[field] = msgs[0] as string;
          }
          setErrors(fieldErrors);
        } else if (json.code === "CAP_FAILED") {
          setServerError("No pudimos verificar que sos humano. Probá de nuevo.");
        } else {
          setServerError(json.error || "No pudimos crear tu cuenta");
        }
        return;
      }

      // Cap tokens are one-time — solve again for the auto sign-in.
      let loginCapToken: string | null = null;
      if (isCapEnabled()) {
        try {
          loginCapToken = await solveCapChallenge();
          if (!loginCapToken) {
            setServerError("Cuenta creada, pero no pudimos iniciar sesión. Probá ingresar manualmente.");
            return;
          }
        } catch {
          setServerError("Cuenta creada, pero no pudimos iniciar sesión. Probá ingresar manualmente.");
          return;
        }
      }

      const signinResult = await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        capToken: loginCapToken ?? undefined,
        redirect: false,
      });
      if (signinResult?.error) {
        setServerError("Cuenta creada, pero no pudimos iniciar sesión. Probá ingresar manualmente.");
        return;
      }
      router.push("/onboarding");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 bg-surface p-5 shadow-[var(--shadow-md)]">
      <FormField label="Nombre del negocio" htmlFor="businessName" error={errors.businessName} required>
        <Input id="businessName" name="businessName" required />
      </FormField>
      <FormField label="Tu nombre" htmlFor="ownerName" error={errors.ownerName} required>
        <Input id="ownerName" name="ownerName" required />
      </FormField>
      <FormField label="Email" htmlFor="email" error={errors.email} required>
        <Input id="email" name="email" type="email" required />
      </FormField>
      <FormField label="Contraseña" htmlFor="password" error={errors.password} hint="Mínimo 8 caracteres" required>
        <PasswordInput id="password" name="password" minLength={8} required autoComplete="new-password" />
      </FormField>
      {serverError && <p className="text-sm text-accent-700 m-0">{serverError}</p>}
      <Button type="submit" variant="primary" block disabled={loading}>
        {loading ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
      <p className="text-sm text-center opacity-70 m-0">
        ¿Ya tenés cuenta? <Link href="/login" className="text-accent">Ingresá</Link>
      </p>
    </form>
  );
}
