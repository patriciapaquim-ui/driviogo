import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "O que está incluso na assinatura?",
    a: "A assinatura inclui seguro completo, IPVA, licenciamento, manutenção preventiva, assistência 24h e documentação. Você só precisa abastecer o veículo.",
  },
  {
    q: "Preciso dar entrada?",
    a: "Não! Nosso modelo é sem entrada. Você paga apenas a mensalidade da assinatura a partir do momento em que recebe o veículo.",
  },
  {
    q: "Posso trocar de veículo durante o contrato?",
    a: "Sim! Dependendo do seu plano, é possível trocar de veículo após um período mínimo. Consulte as condições do seu contrato.",
  },
  {
    q: "Qual a quilometragem permitida?",
    a: "Oferecemos franquias de 1.000 km/mês, 2.000 km/mês e 3.000 km/mês. Você escolhe a que melhor se adapta ao seu perfil.",
  },
  {
    q: "Como funciona a manutenção?",
    a: "As manutenções preventivas estão incluídas. Basta agendar pela área do cliente e levar o veículo à oficina credenciada mais próxima.",
  },
  {
    q: "Posso cancelar a assinatura?",
    a: "Sim, é possível cancelar mediante aviso prévio conforme as condições do contrato. Sem multa após o período mínimo de fidelidade.",
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="py-24">
      <div className="container mx-auto max-w-3xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Tire suas dúvidas
          </p>
          <h2 className="mt-3 font-display text-4xl font-bold text-foreground">
            Perguntas Frequentes
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="rounded-xl border border-border bg-card px-6 shadow-card"
              >
                <AccordionTrigger className="text-left font-sans text-sm font-semibold text-foreground hover:text-primary hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
