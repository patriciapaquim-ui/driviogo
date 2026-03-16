import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Props {
  method: string;
  setMethod: (m: string) => void;
}

const StepPayment = ({ method, setMethod }: Props) => (
  <Card>
    <CardContent className="p-6">
      <h3 className="mb-6 font-display text-xl font-bold text-foreground">Forma de pagamento recorrente</h3>
      <RadioGroup value={method} onValueChange={setMethod} className="space-y-3">
        {[
          { value: "credit_card", label: "Cartão de Crédito", desc: "Cobrança automática mensal no cartão" },
          { value: "boleto", label: "Boleto Bancário", desc: "Boleto enviado mensalmente por e-mail" },
          { value: "pix", label: "PIX", desc: "QR Code gerado a cada vencimento" },
        ].map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-all ${
              method === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
            }`}
          >
            <RadioGroupItem value={opt.value} />
            <div>
              <p className="font-medium text-foreground">{opt.label}</p>
              <p className="text-sm text-muted-foreground">{opt.desc}</p>
            </div>
          </label>
        ))}
      </RadioGroup>
      <p className="mt-4 text-xs text-muted-foreground">
        * O primeiro pagamento será processado após a confirmação da entrega do veículo.
      </p>
    </CardContent>
  </Card>
);

export default StepPayment;
