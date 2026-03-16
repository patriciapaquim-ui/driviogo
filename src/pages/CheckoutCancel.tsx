import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const CheckoutCancel = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <main className="container mx-auto flex flex-1 items-center justify-center px-6 pb-16 pt-28">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card>
          <CardContent className="flex flex-col items-center gap-6 py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground">Pagamento cancelado</h2>
            <p className="max-w-md text-muted-foreground">
              O pagamento não foi concluído. Você pode tentar novamente ou escolher outra forma de pagamento.
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link to="/catalogo">Voltar ao catálogo</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">Página inicial</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </main>
    <Footer />
  </div>
);

export default CheckoutCancel;
