"use client";

import { Sheet } from "@/components/primitives/Sheet";

export function PlanInfoSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <h3 className="text-xl">Plan único</h3>
      <p className="m-0 text-2xl font-heading font-extrabold">$35.000/mes</p>
      <ul className="m-0 flex flex-col gap-1.5 pl-4 text-sm opacity-85 list-disc">
        <li>1 profesional</li>
        <li>Turnos ilimitados</li>
        <li>Recordatorios por WhatsApp</li>
        <li>Página de reserva online</li>
      </ul>
      <p className="m-0 text-xs opacity-60">
        14 días de prueba gratis. Podés cancelar cuando quieras, sin compromiso.
      </p>
    </Sheet>
  );
}
