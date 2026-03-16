import { motion } from "framer-motion";
import { Search, Calculator, FileText, Car } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Escolha seu carro",
    desc: "Navegue pelo catálogo e encontre o veículo ideal para você.",
  },
  {
    icon: Calculator,
    title: "Simule sua assinatura",
    desc: "Configure prazo, quilometragem e veja o valor mensal na hora.",
  },
  {
    icon: FileText,
    title: "Assine o contrato",
    desc: "Processo 100% digital, rápido e sem burocracia.",
  },
  {
    icon: Car,
    title: "Receba e dirija",
    desc: "Seu carro é entregue na porta da sua casa. É só aproveitar.",
  },
];

const HowItWorks = () => {
  return (
    <section id="como-funciona" className="py-24">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Simples e rápido
          </p>
          <h2 className="mt-3 font-display text-4xl font-bold text-foreground">
            Como funciona
          </h2>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative rounded-xl border border-border bg-card p-8 text-center shadow-card"
            >
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <step.icon className="h-7 w-7 text-primary" />
              </div>
              <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                {i + 1}
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
