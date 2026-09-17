"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/primitives/Button";
import { isCapEnabled } from "@/lib/cap-config";
import { solveCapChallenge } from "@/lib/cap-solve";

type Info = {
  status: "pending" | "confirmed" | "done" | "cancelled";
  businessName: string;
  address: string | null;
  clientName: string;
  serviceName: string;
  dateLabel: string;
  time: string;
};

export default function CancelClient({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    fetch(`/api/public/cancel/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => setInfo(json.data))
      .catch(() => setNotFound(true));
  }, [token]);

  async function cancel() {
    setCancelling(true);
    setServerError("");
    try {
      let capToken: string | null = null;
      if (isCapEnabled()) {
        try {
          capToken = await solveCapChallenge();
          if (!capToken) {
            setServerError("No pudimos verificar que sos humano. Probá de nuevo.");
            return;
          }
        } catch {
          setServerError("No pudimos verificar que sos humano. Probá de nuevo.");
          return;
        }
      }

      const res = await fetch(`/api/public/cancel/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capToken: capToken ?? undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setInfo((prev) => (prev ? { ...prev, status: json.data.status } : prev));
      } else if (json.code === "CAP_FAILED") {
        setServerError("No pudimos verificar que sos humano. Probá de nuevo.");
      } else {
        setServerError(json.error ?? "No pudimos cancelar el turno. Probá de nuevo.");
      }
    } catch {
      setServerError("No pudimos cancelar el turno. Probá de nuevo.");
    } finally {
      setCancelling(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm opacity-60 text-center">No encontramos este turno.</p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm opacity-60">Cargando...</p>
      </div>
    );
  }

  const canCancel = info.status === "pending" || info.status === "confirmed";

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-[11px] uppercase tracking-[0.08em] opacity-55">{info.businessName}</div>
      <h1 className="text-xl">
        {info.serviceName} · {info.dateLabel} {info.time}
      </h1>
      {info.address && <p className="text-sm opacity-65 m-0">{info.address}</p>}

      {info.status === "cancelled" && (
        <p className="text-sm opacity-70">Tu turno quedó cancelado. Si querés otro horario, contactá al local.</p>
      )}

      {info.status === "done" && (
        <p className="text-sm opacity-70">Este turno ya fue atendido y no se puede cancelar.</p>
      )}

      {canCancel && (
        <>
          <p className="text-sm opacity-70">Hola {info.clientName}, ¿querés cancelar este turno?</p>
          {serverError && <p className="text-xs text-accent-700">{serverError}</p>}
          <Button variant="danger" onClick={cancel} disabled={cancelling}>
            {cancelling ? "Cancelando..." : "Cancelar turno"}
          </Button>
        </>
      )}
    </div>
  );
}
