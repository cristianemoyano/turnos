"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/primitives/Button";

type Info = {
  status: "pending" | "confirmed" | "done" | "cancelled";
  businessName: string;
  clientName: string;
  serviceName: string;
  dateLabel: string;
  time: string;
};

export default function ConfirmClient({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetch(`/api/public/confirm/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => setInfo(json.data))
      .catch(() => setNotFound(true));
  }, [token]);

  async function confirm() {
    setConfirming(true);
    try {
      const res = await fetch(`/api/public/confirm/${token}`, { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setInfo((prev) => (prev ? { ...prev, status: json.data.status } : prev));
      }
    } finally {
      setConfirming(false);
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

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-[11px] uppercase tracking-[0.08em] opacity-55">{info.businessName}</div>
      <h1 className="text-xl">
        {info.serviceName} · {info.dateLabel} {info.time}
      </h1>

      {info.status === "cancelled" && <p className="text-sm opacity-70">Este turno fue cancelado.</p>}

      {info.status === "confirmed" || info.status === "done" ? (
        <p className="text-sm text-accent font-semibold">¡Turno confirmado! Te esperamos.</p>
      ) : info.status === "pending" ? (
        <>
          <p className="text-sm opacity-70">Hola {info.clientName}, confirmá tu turno para dejarlo reservado.</p>
          <Button variant="primary" onClick={confirm} disabled={confirming}>
            {confirming ? "Confirmando..." : "Confirmar turno"}
          </Button>
        </>
      ) : null}
    </div>
  );
}
