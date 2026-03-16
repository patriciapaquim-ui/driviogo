import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  vehicle: any;
  period: { months: number; label: string };
  mileage: { km: number; label: string };
  price: number;
  accepted: boolean;
  setAccepted: (v: boolean) => void;
  signed: boolean;
  setSigned: (v: boolean) => void;
}

const StepContract = ({ vehicle, period, mileage, price, accepted, setAccepted, signed, setSigned }: Props) => (
  <Card>
    <CardContent className="p-6">
      <h3 className="mb-4 font-display text-xl font-bold text-foreground">Contrato de Assinatura</h3>
      <div className="mb-6 max-h-80 overflow-y-auto rounded-lg border border-border bg-secondary/50 p-6 text-sm leading-relaxed text-muted-foreground">
        <p className="mb-3 font-semibold text-foreground">CONTRATO DE ASSINATURA DE VEÍCULO</p>
        <p className="mb-2">Pelo presente instrumento particular, as partes abaixo qualificadas:</p>
        <p className="mb-2"><strong>CONTRATADA:</strong> DrivioGo Mobilidade Ltda.</p>
        <p className="mb-4"><strong>CONTRATANTE:</strong> Conforme dados pessoais informados.</p>
        <p className="mb-2"><strong>CLÁUSULA 1ª — DO OBJETO:</strong> O presente contrato tem por objeto a assinatura do veículo <strong>{vehicle.brand} {vehicle.model} {vehicle.year}</strong>, pelo período de <strong>{period.label}</strong>, com franquia de <strong>{mileage.label}</strong>.</p>
        <p className="mb-2"><strong>CLÁUSULA 2ª — DO VALOR:</strong> O valor mensal da assinatura é de <strong>R$ {price.toLocaleString("pt-BR")}</strong>, incluindo seguro completo, IPVA, manutenções preventivas e corretivas, e assistência 24h.</p>
        <p className="mb-2"><strong>CLÁUSULA 3ª — DAS OBRIGAÇÕES DO CONTRATANTE:</strong> O contratante se obriga a: (a) utilizar o veículo de forma adequada; (b) realizar pagamentos na data de vencimento; (c) não exceder a franquia de quilometragem sem aviso prévio; (d) devolver o veículo em boas condições ao término do contrato.</p>
        <p className="mb-2"><strong>CLÁUSULA 4ª — DA VIGÊNCIA:</strong> O contrato terá vigência de {period.months} meses a contar da data de entrega do veículo.</p>
        <p className="mb-2"><strong>CLÁUSULA 5ª — DO CANCELAMENTO:</strong> O cancelamento antecipado está sujeito a multa proporcional ao período restante.</p>
        <p className="mb-2"><strong>CLÁUSULA 6ª — FORO:</strong> Para dirimir quaisquer dúvidas, fica eleito o foro da comarca de São Paulo/SP.</p>
      </div>

      <div className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(!!v)} />
          <span className="text-sm text-foreground">Li e concordo com todos os termos e condições do contrato acima.</span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={signed} onCheckedChange={(v) => setSigned(!!v)} />
          <span className="text-sm text-foreground">
            <Shield className="mr-1 inline h-4 w-4 text-primary" />
            Declaro que assino eletronicamente este contrato, com plena validade jurídica conforme a Medida Provisória 2.200-2/2001.
          </span>
        </label>
      </div>
    </CardContent>
  </Card>
);

export default StepContract;
