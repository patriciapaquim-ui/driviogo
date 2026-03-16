import { Check, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  vehicle: any;
}

const StepConfirmation = ({ vehicle }: Props) => (
  <Card className="border-primary/30">
    <CardContent className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <Check className="h-10 w-10 text-primary" />
      </div>
      <h2 className="font-display text-3xl font-bold text-foreground">Assinatura solicitada!</h2>
      <p className="max-w-md text-muted-foreground">
        Sua assinatura do <strong className="text-foreground">{vehicle.brand} {vehicle.model}</strong> foi registrada com sucesso.
        Nossa equipe entrará em contato em até 24h para agendar a entrega do veículo.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link to="/dashboard">
            Ir para Minha Conta <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default StepConfirmation;
