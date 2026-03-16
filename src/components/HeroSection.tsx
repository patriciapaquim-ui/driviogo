import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Clock, Wrench } from "lucide-react";
import heroImage from "@/assets/hero-car.jpg";

const highlights = [
  { icon: Shield, label: "Seguro incluso" },
  { icon: Clock, label: "Sem entrada" },
  { icon: Wrench, label: "Manutenção inclusa" },
];

const HeroSection = () => {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroImage} alt="Carro de luxo" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
      </div>

      <div className="container relative z-10 mx-auto px-6 pt-24">
        <div className="max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary"
          >
            Assinatura de Veículos
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6 font-display text-5xl font-bold leading-tight text-foreground md:text-7xl"
          >
            Dirija sem
            <br />
            <span className="text-gradient-gold">complicação.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mb-8 max-w-lg text-lg text-muted-foreground"
          >
            Escolha seu carro, assine e dirija. Seguro, IPVA, manutenção e assistência 24h inclusos.
            Sem entrada, sem burocracia.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap items-center gap-4"
          >
            <Link
              to="/catalogo"
              className="flex items-center gap-2 rounded-lg bg-primary px-8 py-4 text-sm font-bold text-primary-foreground shadow-gold transition-all hover:brightness-110"
            >
              Ver Catálogo <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#como-funciona"
              className="rounded-lg border border-border px-8 py-4 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Como Funciona
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-14 flex flex-wrap gap-8"
          >
            {highlights.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
