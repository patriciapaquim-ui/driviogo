import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { Vehicle } from "@/data/vehicles";
import type { PublicPricingPeriod } from "@/hooks/usePublicPricing";
import type { PublicDiscount } from "@/hooks/usePublicDiscounts";

// Fallback pricing used when no admin pricing data is available
const FALLBACK_PERIODS = [
  { months: 12, label: "12 meses", factor: 1.15 },
  { months: 24, label: "24 meses", factor: 1.0 },
  { months: 36, label: "36 meses", factor: 0.9 },
];

const FALLBACK_MILEAGES = [
  { km: 1000, label: "1.000 km/mês", factor: 0 },
  { km: 2000, label: "2.000 km/mês", factor: 350 },
  { km: 3000, label: "3.000 km/mês", factor: 650 },
];

interface Props {
  vehicle: Vehicle;
  /** Real pricing periods from the active admin pricing table. When provided,
   *  exact monthly prices are shown. When absent, falls back to basePrice × factor. */
  pricingPeriods?: PublicPricingPeriod[];
  /** Best applicable discount for this vehicle */
  discount?: PublicDiscount | null;
}

const SubscriptionSimulator = ({ vehicle, pricingPeriods, discount }: Props) => {
  const navigate = useNavigate();
  const [periodIdx, setPeriodIdx] = useState(0);
  const [mileageIdx, setMileageIdx] = useState(0);

  const hasRealPricing = !!pricingPeriods?.length;

  const handlePeriodChange = (idx: number) => {
    setPeriodIdx(idx);
    setMileageIdx(0); // reset mileage when period changes
  };

  // Derive display data from real pricing or fallback
  let displayPeriods: { months: number; label: string }[];
  let displayMileages: { km: number; label: string }[];
  let basePrice: number;

  if (hasRealPricing) {
    displayPeriods = pricingPeriods!.map((p) => ({ months: p.months, label: p.label }));
    const selectedPeriod = pricingPeriods![periodIdx] ?? pricingPeriods![0];
    displayMileages = (selectedPeriod?.kmOptions ?? []).map((km) => ({
      km: km.monthlyKm,
      label: km.label,
    }));
    basePrice = selectedPeriod?.kmOptions[mileageIdx]?.price ?? 0;
  } else {
    displayPeriods = FALLBACK_PERIODS;
    displayMileages = FALLBACK_MILEAGES;
    basePrice = Math.round(
      vehicle.basePrice * FALLBACK_PERIODS[periodIdx].factor +
        FALLBACK_MILEAGES[mileageIdx].factor,
    );
  }

  const safePeriodIdx = Math.min(periodIdx, displayPeriods.length - 1);
  const safeMileageIdx = Math.min(mileageIdx, displayMileages.length - 1);

  const discountedPrice =
    discount && basePrice > 0
      ? Math.round(basePrice * (1 - discount.percentage / 100))
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6 shadow-card"
    >
      {/* Highlighted discount banner */}
      {discount?.isHighlighted && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <span className="text-xl">🏷️</span>
          <div>
            <p className="text-sm font-bold text-red-600">{discount.name}</p>
            <p className="text-xs text-red-500">
              {discount.percentage}% de desconto aplicado neste veículo
              {discount.description ? ` — ${discount.description}` : ""}
            </p>
          </div>
        </div>
      )}

      <h3 className="mb-6 font-display text-xl font-bold text-foreground">Simule sua assinatura</h3>

      {/* Period */}
      <div className="mb-6">
        <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Período do contrato
        </label>
        <div className="grid grid-cols-3 gap-2">
          {displayPeriods.map((p, i) => (
            <button
              key={p.months}
              onClick={() => handlePeriodChange(i)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                i === safePeriodIdx
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
        <div className={`grid gap-2 ${displayMileages.length <= 3 ? "grid-cols-3" : "grid-cols-4"}`}>
          {displayMileages.map((m, i) => (
            <button
              key={m.km}
              onClick={() => setMileageIdx(i)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                i === safeMileageIdx
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
        {basePrice > 0 ? (
          discountedPrice ? (
            <>
              <p className="mt-2 text-base text-muted-foreground line-through">
                R$ {basePrice.toLocaleString("pt-BR")}/mês
              </p>
              <p className="font-display text-4xl font-bold text-red-500">
                R$ {discountedPrice.toLocaleString("pt-BR")}
                <span className="text-base font-normal text-muted-foreground">/mês</span>
              </p>
              <p className="mt-1 text-xs font-semibold text-red-500">
                Economia de R$ {(basePrice - discountedPrice).toLocaleString("pt-BR")}/mês
              </p>
            </>
          ) : (
            <p className="mt-2 font-display text-4xl font-bold text-primary">
              R$ {basePrice.toLocaleString("pt-BR")}
              <span className="text-base font-normal text-muted-foreground">/mês</span>
            </p>
          )
        ) : (
          <p className="mt-2 font-display text-2xl font-bold text-muted-foreground">
            Consulte
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Seguro, IPVA, manutenção e assistência inclusos
        </p>
      </div>

      <button
        className="mt-6 w-full rounded-lg bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-gold transition-all hover:brightness-110"
        onClick={() =>
          navigate(
            `/checkout?vehicle=${vehicle.id}&period=${safePeriodIdx}&mileage=${safeMileageIdx}`,
          )
        }
      >
        Quero assinar este veículo
      </button>
    </motion.div>
  );
};

export default SubscriptionSimulator;
