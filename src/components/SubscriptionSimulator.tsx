import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { Vehicle } from "@/data/vehicles";

interface Props {
  vehicle: Vehicle;
}

const periods = [
  { months: 12, label: "12 meses", factor: 1.15 },
  { months: 24, label: "24 meses", factor: 1.0 },
  { months: 36, label: "36 meses", factor: 0.9 },
];

const mileages = [
  { km: 1000, label: "1.000 km/mês", factor: 0 },
  { km: 2000, label: "2.000 km/mês", factor: 350 },
  { km: 3000, label: "3.000 km/mês", factor: 650 },
];

const SubscriptionSimulator = ({ vehicle }: Props) => {
  const navigate = useNavigate();
  const [periodIdx, setPeriodIdx] = useState(1);
  const [mileageIdx, setMileageIdx] = useState(0);

  const period = periods[periodIdx];
  const mileage = mileages[mileageIdx];
  const price = Math.round(vehicle.basePrice * period.factor + mileage.factor);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6 shadow-card"
    >
      <h3 className="mb-6 font-display text-xl font-bold text-foreground">Simule sua assinatura</h3>

      {/* Period */}
      <div className="mb-6">
        <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Período do contrato
        </label>
        <div className="grid grid-cols-3 gap-2">
          {periods.map((p, i) => (
            <button
              key={p.months}
              onClick={() => setPeriodIdx(i)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                i === periodIdx
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mileage */}
      <div className="mb-8">
        <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Franquia de quilometragem
        </label>
        <div className="grid grid-cols-3 gap-2">
          {mileages.map((m, i) => (
            <button
              key={m.km}
              onClick={() => setMileageIdx(i)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                i === mileageIdx
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div className="rounded-xl bg-primary/5 p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Valor mensal
        </p>
        <p className="mt-2 font-display text-4xl font-bold text-primary">
          R$ {price.toLocaleString("pt-BR")}
          <span className="text-base font-normal text-muted-foreground">/mês</span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Seguro, IPVA, manutenção e assistência inclusos
        </p>
      </div>

      <button
        className="mt-6 w-full rounded-lg bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-gold transition-all hover:brightness-110"
        onClick={() =>
          navigate(`/checkout?vehicle=${vehicle.id}&period=${periodIdx}&mileage=${mileageIdx}`)
        }
      >
        Quero assinar este veículo
      </button>
    </motion.div>
  );
};

export default SubscriptionSimulator;
