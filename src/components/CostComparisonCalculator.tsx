import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Car,
  TrendingDown,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ─── Types ─────────────────────────────────────────────── */
interface OwnCarCost {
  label: string;
  tooltip: string;
  value: number;
  min: number;
  max: number;
  step: number;
  isMonthly?: boolean; // if true, multiply × 12 for annual total
}

/* ─── Default cost data (valores anuais em R$) ──────────── */
const defaultOwnCarCosts: OwnCarCost[] = [
  {
    label: "Parcela do financiamento",
    tooltip: "Valor mensal da parcela × 12 meses",
    value: 1800,
    min: 500,
    max: 6000,
    step: 100,
    isMonthly: true,
  },
  {
    label: "IPVA",
    tooltip: "Imposto sobre Propriedade de Veículo Automotor (anual)",
    value: 2400,
    min: 500,
    max: 8000,
    step: 100,
  },
  {
    label: "Seguro",
    tooltip: "Seguro do veículo (valor anual)",
    value: 3600,
    min: 800,
    max: 10000,
    step: 200,
  },
  {
    label: "Manutenção preventiva",
    tooltip: "Revisões, troca de óleo, filtros (valor anual estimado)",
    value: 2400,
    min: 500,
    max: 8000,
    step: 100,
  },
  {
    label: "Manutenção corretiva / imprevistos",
    tooltip: "Reparos inesperados, pneus, freios, etc. (valor anual estimado)",
    value: 1800,
    min: 0,
    max: 10000,
    step: 100,
  },
  {
    label: "Licenciamento e documentação",
    tooltip: "DPVAT, licenciamento, multas administrativas (valor anual)",
    value: 450,
    min: 100,
    max: 2000,
    step: 50,
  },
  {
    label: "Depreciação estimada",
    tooltip: "Perda de valor do veículo ao ano (~15% ao ano para carros novos)",
    value: 9000,
    min: 1000,
    max: 25000,
    step: 500,
  },
];

const defaultSubscriptionMonthly = 2500;

/* ─── Helpers ───────────────────────────────────────────── */
function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function annualValue(cost: OwnCarCost): number {
  return cost.isMonthly ? cost.value * 12 : cost.value;
}

/* ─── Sub-components ─────────────────────────────────────── */
function CostSliderRow({
  cost,
  onChange,
}: {
  cost: OwnCarCost;
  onChange: (v: number) => void;
}) {
  const annual = annualValue(cost);
  return (
    <div className="group rounded-lg border border-border bg-card/50 p-4 transition-colors hover:border-border/80 hover:bg-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">{cost.label}</span>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/60 hover:text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {cost.tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold text-foreground">{formatBRL(annual)}</span>
          {cost.isMonthly && (
            <span className="ml-1 text-xs text-muted-foreground">/ano</span>
          )}
        </div>
      </div>
      <Slider
        value={[cost.value]}
        min={cost.min}
        max={cost.max}
        step={cost.step}
        onValueChange={([v]) => onChange(v)}
        className="[&_[role=slider]]:border-primary [&_[role=slider]]:bg-primary"
      />
      {cost.isMonthly && (
        <p className="mt-1 text-xs text-muted-foreground">
          {formatBRL(cost.value)}/mês × 12
        </p>
      )}
    </div>
  );
}

function ComparisonBar({
  ownTotal,
  subscriptionTotal,
}: {
  ownTotal: number;
  subscriptionTotal: number;
}) {
  const max = Math.max(ownTotal, subscriptionTotal);
  const ownPct = (ownTotal / max) * 100;
  const subPct = (subscriptionTotal / max) * 100;
  const savings = ownTotal - subscriptionTotal;
  const savingsPct = Math.round((savings / ownTotal) * 100);

  return (
    <div className="space-y-5">
      {/* Own car bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-medium text-muted-foreground">
            <Car className="h-4 w-4" />
            Carro próprio
          </span>
          <span className="font-bold text-foreground">{formatBRL(ownTotal)}/ano</span>
        </div>
        <div className="h-9 w-full overflow-hidden rounded-md bg-muted/40">
          <motion.div
            className="h-full rounded-md bg-destructive/70"
            initial={{ width: 0 }}
            animate={{ width: `${ownPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Subscription bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-medium text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Assinatura DrivioGo
          </span>
          <span className="font-bold text-primary">{formatBRL(subscriptionTotal)}/ano</span>
        </div>
        <div className="h-9 w-full overflow-hidden rounded-md bg-muted/40">
          <motion.div
            className="h-full rounded-md bg-primary/70"
            initial={{ width: 0 }}
            animate={{ width: `${subPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
          />
        </div>
      </div>

      {/* Savings callout */}
      {savings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-5 py-4"
        >
          <TrendingDown className="h-6 w-6 shrink-0 text-primary" />
          <p className="text-sm text-foreground">
            Com a assinatura você <strong className="text-primary">economiza {formatBRL(savings)}</strong>{" "}
            ao ano — <strong className="text-primary">{savingsPct}% a menos</strong> do que ter um carro próprio.
          </p>
        </motion.div>
      )}

      {savings <= 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-5 py-4">
          <Info className="h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Ajuste os valores para ver a comparação real com o seu perfil.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────── */
const CostComparisonCalculator = () => {
  const [costs, setCosts] = useState<OwnCarCost[]>(defaultOwnCarCosts);
  const [subscriptionMonthly, setSubscriptionMonthly] = useState(defaultSubscriptionMonthly);
  const [showDetails, setShowDetails] = useState(false);

  const ownTotal = useMemo(
    () => costs.reduce((acc, c) => acc + annualValue(c), 0),
    [costs]
  );
  const subscriptionTotal = subscriptionMonthly * 12;

  function updateCost(index: number, value: number) {
    setCosts((prev) => prev.map((c, i) => (i === index ? { ...c, value } : c)));
  }

  const includedItems = [
    "IPVA incluso",
    "Seguro incluso",
    "Manutenção inclusa",
    "Assistência 24h",
    "Sem depreciação",
    "Sem burocracia",
  ];

  return (
    <section id="comparativo-custos" className="py-24 bg-muted/5">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Comparativo de custos
          </p>
          <h2 className="mt-3 font-display text-4xl font-bold text-foreground">
            Carro próprio vs. assinatura
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Ajuste os valores conforme o seu perfil e veja quanto você realmente gasta
            com um carro próprio comparado à assinatura.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* ── Left: inputs ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            {/* Own car panel */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <Car className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    Carro próprio
                  </h3>
                  <p className="text-xs text-muted-foreground">Custos anuais estimados</p>
                </div>
                <span className="ml-auto text-xl font-bold text-foreground">
                  {formatBRL(ownTotal)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">/ano</span>
                </span>
              </div>

              <div className="space-y-3">
                {costs.map((cost, i) => (
                  <CostSliderRow
                    key={cost.label}
                    cost={cost}
                    onChange={(v) => updateCost(i, v)}
                  />
                ))}
              </div>
            </div>

            {/* Subscription panel */}
            <div className="rounded-xl border border-primary/30 bg-card p-6 shadow-card">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    Assinatura DrivioGo
                  </h3>
                  <p className="text-xs text-muted-foreground">Tudo incluso, sem surpresas</p>
                </div>
                <span className="ml-auto text-xl font-bold text-primary">
                  {formatBRL(subscriptionTotal)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">/ano</span>
                </span>
              </div>

              {/* Monthly slider */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Mensalidade</span>
                  <span className="text-sm font-bold text-primary">
                    {formatBRL(subscriptionMonthly)}/mês
                  </span>
                </div>
                <Slider
                  value={[subscriptionMonthly]}
                  min={800}
                  max={8000}
                  step={100}
                  onValueChange={([v]) => setSubscriptionMonthly(v)}
                  className="[&_[role=slider]]:border-primary [&_[role=slider]]:bg-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Valor fixo e previsível, sem custos extras
                </p>
              </div>

              {/* What's included */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="mt-4 flex w-full items-center justify-between rounded-lg px-1 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span>O que está incluso na assinatura?</span>
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 grid grid-cols-2 gap-2"
                >
                  {includedItems.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-xs font-medium text-foreground"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                      {item}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* ── Right: visual comparison ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col gap-6"
          >
            {/* Bar chart */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-6 font-display text-lg font-semibold text-foreground">
                Gasto anual total
              </h3>
              <ComparisonBar
                ownTotal={ownTotal}
                subscriptionTotal={subscriptionTotal}
              />
            </div>

            {/* Breakdown table */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
                Detalhamento anual
              </h3>
              <div className="space-y-2">
                {costs.map((cost) => (
                  <div
                    key={cost.label}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/20"
                  >
                    <span className="text-muted-foreground">{cost.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-foreground">
                        {formatBRL(annualValue(cost))}
                      </span>
                      <CheckCircle2
                        className="h-4 w-4 text-primary"
                        title="Incluso na assinatura"
                      />
                    </div>
                  </div>
                ))}
                <div className="mt-3 border-t border-border pt-3">
                  <div className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm">
                    <span className="font-semibold text-foreground">Total carro próprio</span>
                    <span className="font-bold text-foreground">{formatBRL(ownTotal)}/ano</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-primary/5 px-2 py-1.5 text-sm">
                    <span className="font-semibold text-primary">Total assinatura</span>
                    <span className="font-bold text-primary">
                      {formatBRL(subscriptionTotal)}/ano
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center"
            >
              <p className="mb-1 font-display text-lg font-semibold text-foreground">
                Pronto para simplificar?
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                Escolha seu veículo e comece sua assinatura hoje.
              </p>
              <a
                href="/catalogo"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-gold transition-all hover:brightness-110"
              >
                Ver catálogo <Car className="h-4 w-4" />
              </a>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CostComparisonCalculator;
