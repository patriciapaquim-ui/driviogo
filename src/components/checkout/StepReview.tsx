import { Card, CardContent } from "@/components/ui/card";

interface Props {
  vehicle: any;
  period: { months: number; label: string };
  mileage: { km: number; label: string };
  price: number;
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between border-b border-border pb-3">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-foreground">{value}</span>
  </div>
);

const StepReview = ({ vehicle, period, mileage, price }: Props) => (
  <div className="space-y-6">
    <div className="text-center">
      <h2 className="font-display text-2xl font-bold text-foreground">Confirme os dados da sua assinatura</h2>
      <p className="mt-2 text-muted-foreground">Revise todas as informações antes de prosseguir.</p>
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardContent className="p-6">
          <img src={vehicle.image} alt={vehicle.model} className="mb-4 aspect-[16/10] w-full rounded-lg object-cover" />
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">{vehicle.brand}</p>
          <h3 className="mt-1 font-display text-2xl font-bold text-foreground">
            {vehicle.model} <span className="text-muted-foreground">{vehicle.year}</span>
          </h3>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col justify-center gap-6 p-6">
          <h3 className="font-display text-xl font-bold text-foreground">Resumo do plano</h3>
          <div className="space-y-4">
            <DetailRow label="Período" value={period.label} />
            <DetailRow label="Quilometragem" value={mileage.label} />
            <DetailRow label="Incluso" value="Seguro, IPVA, manutenção, assistência" />
          </div>
          <div className="rounded-xl bg-primary/5 p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor mensal</p>
            <p className="mt-2 font-display text-4xl font-bold text-primary">
              R$ {price.toLocaleString("pt-BR")}
              <span className="text-base font-normal text-muted-foreground">/mês</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default StepReview;
