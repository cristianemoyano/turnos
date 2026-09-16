import { Card, CardKicker, CardTitle, CardBody } from "@/components/primitives/Card";
import type { BizDraft } from "./types";

export function StepListo({ biz }: { biz: BizDraft }) {
  return (
    <div className="flex flex-col gap-3.5">
      <Card elevated>
        <CardKicker>Listo para usarse</CardKicker>
        <CardTitle>{biz.name}</CardTitle>
        <CardBody>
          {biz.phone}
          <br />
          {biz.address}
        </CardBody>
      </Card>
      <p className="text-sm opacity-75 leading-relaxed m-0">
        Tu agenda ya está lista con tus horarios y servicios. Podés empezar a cargar turnos ahora mismo.
      </p>
    </div>
  );
}
