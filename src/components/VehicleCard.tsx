import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Fuel, Settings, Users } from "lucide-react";
import type { Vehicle } from "@/data/vehicles";
import { useBestVehicleDiscount } from "@/hooks/usePublicDiscounts";

interface VehicleCardProps {
  vehicle: Vehicle;
  index?: number;
}

const VehicleCard = ({ vehicle, index = 0 }: VehicleCardProps) => {
  const discount = useBestVehicleDiscount(vehicle.id);
  const discountedPrice =
    discount && vehicle.basePrice
      ? Math.round(vehicle.basePrice * (1 - discount.percentage / 100))
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
    >
      <Link
        to={`/veiculo/${vehicle.id}`}
        className="group block overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all hover:border-primary/30 hover:shadow-gold"
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={vehicle.image}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {!vehicle.available && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <span className="rounded-full bg-muted px-4 py-1.5 text-xs font-semibold text-muted-foreground">
                Indisponível
              </span>
            </div>
          )}
          <div className="absolute left-3 top-3 rounded-md bg-primary/90 px-3 py-1 text-xs font-bold text-primary-foreground">
            {vehicle.bodyType}
          </div>
          {/* Highlighted discount banner */}
          {discount?.isHighlighted && (
            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
              -{discount.percentage}% OFF
            </div>
          )}
        </div>

        <div className="p-5">
          {/* Non-highlighted discount chip */}
          {discount && !discount.isHighlighted && (
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
              -{discount.percentage}% desconto
            </div>
          )}

          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {vehicle.brand}
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
            {vehicle.model} <span className="text-muted-foreground">{vehicle.year}</span>
          </h3>

          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Fuel className="h-3.5 w-3.5" /> {vehicle.specs.fuel}
            </span>
            <span className="flex items-center gap-1">
              <Settings className="h-3.5 w-3.5" /> {vehicle.specs.transmission.split(" ")[0]}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {vehicle.specs.seats} lugares
            </span>
          </div>

          <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
            <div>
              <p className="text-xs text-muted-foreground">A partir de</p>
              {discountedPrice ? (
                <>
                  <p className="text-sm text-muted-foreground line-through">
                    R$ {vehicle.basePrice.toLocaleString("pt-BR")}/mês
                  </p>
                  <p className="font-display text-2xl font-bold text-red-500">
                    R$ {discountedPrice.toLocaleString("pt-BR")}
                    <span className="text-sm font-normal text-muted-foreground">/mês</span>
                  </p>
                </>
              ) : (
                <p className="font-display text-2xl font-bold text-primary">
                  R$ {vehicle.basePrice.toLocaleString("pt-BR")}
                  <span className="text-sm font-normal text-muted-foreground">/mês</span>
                </p>
              )}
            </div>
            <span className="text-xs font-semibold text-primary transition-transform group-hover:translate-x-1">
              Ver detalhes →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default VehicleCard;
