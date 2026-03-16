import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const CheckoutSuccess = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <main className="container mx-auto flex flex-1 items-center justify-center px-6 pb-16 pt-28">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="border-primary/30">
          <CardContent className="flex flex-col items-center gap-6 py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-10 w-10 text-primary" />
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground">Pagamento confirmado!</h2>
            <p className="max-w-md text-muted-foreground">
              Sua assinatura foi ativada com sucesso. Nossa equipe entrará em contato em até 24h para agendar a entrega do veículo.
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
      </motion.div>
    </main>
    <Footer />
  </div>
);

export default CheckoutSuccess;
